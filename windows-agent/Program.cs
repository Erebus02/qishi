using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace ModelFlow.SolidWorksAgent;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [STAThread]
    private static async Task<int> Main()
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        var config = AgentConfig.Load();
        if (!config.IsValid)
        {
            Console.Error.WriteLine("请设置 SW_AGENT_SERVER 和 SW_AGENT_TOKEN 环境变量。");
            return 2;
        }

        using var http = new HttpClient { BaseAddress = new Uri(config.Server.TrimEnd('/') + "/"), Timeout = TimeSpan.FromMinutes(30) };
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", config.Token);
        http.DefaultRequestHeaders.Add("X-Agent-Name", config.AgentName);
        http.DefaultRequestHeaders.Add("X-Agent-Version", "1.0.0");

        Console.WriteLine($"ModelFlow SolidWorks Agent 1.0.0 | {config.AgentName}");
        Console.WriteLine($"服务器：{config.Server}");
        Console.WriteLine("按 Ctrl+C 停止。\n");

        using var stop = new CancellationTokenSource();
        Console.CancelKeyPress += (_, e) => { e.Cancel = true; stop.Cancel(); };

        var runner = new SolidWorksRunner(config.WorkDirectory);
        while (!stop.IsCancellationRequested)
        {
            try
            {
                var response = await http.GetAsync("api/agent/tasks/next", stop.Token);
                if (response.StatusCode == System.Net.HttpStatusCode.NoContent)
                {
                    await Task.Delay(TimeSpan.FromSeconds(config.PollSeconds), stop.Token);
                    continue;
                }
                response.EnsureSuccessStatusCode();
                var envelope = await response.Content.ReadFromJsonAsync<TaskEnvelope>(JsonOptions, stop.Token);
                if (envelope?.Task is null) continue;
                await ExecuteTaskAsync(http, runner, envelope.Task, stop.Token);
            }
            catch (OperationCanceledException) when (stop.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[{DateTime.Now:HH:mm:ss}] 轮询失败：{ex.Message}");
                await Task.Delay(TimeSpan.FromSeconds(Math.Max(config.PollSeconds, 10)), stop.Token);
            }
        }

        runner.Dispose();
        return 0;
    }

    private static async Task ExecuteTaskAsync(HttpClient http, SolidWorksRunner runner, AgentTask task, CancellationToken ct)
    {
        Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 开始任务 {task.Id} / {task.Type}");
        string? localInput = null;
        try
        {
            if (!string.IsNullOrWhiteSpace(task.InputUrl))
            {
                var fileName = GetDownloadFileName(task.InputUrl) ?? $"input-{task.Id}.sldasm";
                localInput = Path.Combine(runner.CreateTaskDirectory(task.Id), fileName);
                await using var source = await http.GetStreamAsync(task.InputUrl, ct);
                await using var target = File.Create(localInput);
                await source.CopyToAsync(target, ct);
            }

            var result = runner.Execute(task, localInput);
            var uploaded = new List<object>();
            foreach (var artifact in result.Artifacts)
            {
                await using var stream = File.OpenRead(artifact.Path);
                using var request = new HttpRequestMessage(HttpMethod.Put, task.ArtifactUrl) { Content = new StreamContent(stream) };
                request.Content.Headers.ContentType = new MediaTypeHeaderValue(artifact.ContentType);
                request.Headers.Add("X-File-Name", Path.GetFileName(artifact.Path));
                using var uploadResponse = await http.SendAsync(request, ct);
                uploadResponse.EnsureSuccessStatusCode();
                uploaded.Add(await uploadResponse.Content.ReadFromJsonAsync<object>(JsonOptions, ct) ?? new { });
            }

            await CompleteAsync(http, task.CompleteUrl, true, new { result.Data, artifacts = uploaded }, null, ct);
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] 任务完成 {task.Id}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[{DateTime.Now:HH:mm:ss}] 任务失败 {task.Id}：{ex}");
            await CompleteAsync(http, task.CompleteUrl, false, null, ex.Message, ct);
        }
        finally
        {
            runner.TryCleanTaskDirectory(task.Id);
        }
    }

    private static Task<HttpResponseMessage> CompleteAsync(HttpClient http, string url, bool success, object? result, string? error, CancellationToken ct) =>
        http.PostAsJsonAsync(url, new { success, result, error }, JsonOptions, ct);

    private static string? GetDownloadFileName(string url)
    {
        var uri = new Uri(url);
        return uri.Segments.LastOrDefault()?.Trim('/');
    }
}

internal sealed record AgentConfig(string Server, string Token, string AgentName, string WorkDirectory, int PollSeconds)
{
    public bool IsValid => Uri.TryCreate(Server, UriKind.Absolute, out _) && !string.IsNullOrWhiteSpace(Token);
    public static AgentConfig Load()
    {
        var work = Environment.GetEnvironmentVariable("SW_AGENT_WORKDIR") ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ModelFlow", "AgentWork");
        return new(
            Environment.GetEnvironmentVariable("SW_AGENT_SERVER") ?? "",
            Environment.GetEnvironmentVariable("SW_AGENT_TOKEN") ?? "",
            Environment.GetEnvironmentVariable("SW_AGENT_NAME") ?? Environment.MachineName,
            work,
            int.TryParse(Environment.GetEnvironmentVariable("SW_AGENT_POLL_SECONDS"), out var seconds) ? Math.Clamp(seconds, 2, 300) : 5
        );
    }
}

internal sealed record TaskEnvelope(AgentTask? Task);
internal sealed record AgentTask(string Id, string Type, string? DeviceId, string? VersionId, string? InputFileId, JsonElement Parameters, string? InputUrl, string CompleteUrl, string ArtifactUrl);
internal sealed record TaskArtifact(string Path, string ContentType);
internal sealed record TaskExecutionResult(object Data, IReadOnlyList<TaskArtifact> Artifacts);

internal sealed class SolidWorksRunner : IDisposable
{
    private readonly string _workRoot;
    private dynamic? _application;

    public SolidWorksRunner(string workRoot)
    {
        _workRoot = workRoot;
        Directory.CreateDirectory(_workRoot);
    }

    public string CreateTaskDirectory(string taskId)
    {
        var path = Path.Combine(_workRoot, taskId);
        Directory.CreateDirectory(path);
        return path;
    }

    public TaskExecutionResult Execute(AgentTask task, string? inputPath)
    {
        if (string.IsNullOrWhiteSpace(inputPath) || !File.Exists(inputPath)) throw new InvalidOperationException("任务缺少可用的输入模型文件。");
        dynamic app = GetApplication();
        int errors = 0, warnings = 0;
        dynamic? document = app.OpenDoc6(inputPath, DetectDocumentType(inputPath), 1, "", ref errors, ref warnings);
        if (document is null) throw new InvalidOperationException($"SolidWorks 无法打开文件，错误码 {errors}，警告码 {warnings}。");

        var artifacts = new List<TaskArtifact>();
        try
        {
            document.ForceRebuild3(false);
            return task.Type switch
            {
                "generate_thumbnail" => GenerateThumbnail(document, task, artifacts),
                "extract_properties" => ExtractProperties(document, artifacts),
                "extract_bom" => ExtractBom(document, artifacts),
                "export_pdf" => Export(document, task, artifacts, ".pdf", "application/pdf"),
                "export_dxf" => Export(document, task, artifacts, ".dxf", "application/dxf"),
                "pack_and_go" => PackAndGo(document, task, artifacts),
                "rebuild_check" => new TaskExecutionResult(new { rebuilt = true, errors, warnings }, artifacts),
                _ => throw new NotSupportedException($"不支持任务类型：{task.Type}"),
            };
        }
        finally
        {
            app.CloseDoc((string)document.GetTitle());
            Marshal.FinalReleaseComObject(document);
        }
    }

    private TaskExecutionResult GenerateThumbnail(dynamic document, AgentTask task, List<TaskArtifact> artifacts)
    {
        document.ViewZoomtofit2();
        var path = Path.Combine(CreateTaskDirectory(task.Id), "thumbnail.bmp");
        bool saved = document.SaveBMP(path, 1280, 960);
        if (!saved || !File.Exists(path)) throw new InvalidOperationException("缩略图生成失败。");
        artifacts.Add(new(path, "image/bmp"));
        return new(new { width = 1280, height = 960 }, artifacts);
    }

    private static TaskExecutionResult ExtractProperties(dynamic document, List<TaskArtifact> artifacts)
    {
        var properties = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        dynamic manager = document.Extension.CustomPropertyManager[""];
        string[]? names = manager.GetNames() as string[];
        if (names is not null)
        {
            foreach (var name in names)
            {
                string value = "", resolved = ""; bool wasResolved = false, link = false;
                manager.Get6(name, false, out value, out resolved, out wasResolved, out link);
                properties[name] = string.IsNullOrWhiteSpace(resolved) ? value : resolved;
            }
        }
        return new(new { title = (string)document.GetTitle(), path = (string)document.GetPathName(), properties }, artifacts);
    }

    private TaskExecutionResult ExtractBom(dynamic document, List<TaskArtifact> artifacts)
    {
        var components = new List<object>();
        if (DetectDocumentType((string)document.GetPathName()) == 2)
        {
            object[]? items = document.GetComponents(false) as object[];
            if (items is not null)
            {
                foreach (dynamic component in items)
                {
                    components.Add(new { name = (string)component.Name2, path = (string)component.GetPathName(), suppressed = (bool)component.IsSuppressed() });
                    Marshal.FinalReleaseComObject(component);
                }
            }
        }
        return new(new { count = components.Count, components }, artifacts);
    }

    private TaskExecutionResult Export(dynamic document, AgentTask task, List<TaskArtifact> artifacts, string extension, string contentType)
    {
        var output = Path.Combine(CreateTaskDirectory(task.Id), Path.GetFileNameWithoutExtension((string)document.GetTitle()) + extension);
        int errors = 0, warnings = 0;
        bool ok = document.Extension.SaveAs(output, 0, 1, null, ref errors, ref warnings);
        if (!ok || !File.Exists(output)) throw new InvalidOperationException($"导出失败，错误码 {errors}，警告码 {warnings}。");
        artifacts.Add(new(output, contentType));
        return new(new { output = Path.GetFileName(output), errors, warnings }, artifacts);
    }

    private TaskExecutionResult PackAndGo(dynamic document, AgentTask task, List<TaskArtifact> artifacts)
    {
        var outputDir = Path.Combine(CreateTaskDirectory(task.Id), "pack-and-go");
        Directory.CreateDirectory(outputDir);
        dynamic pack = document.Extension.GetPackAndGo();
        pack.FlattenToSingleFolder = true;
        pack.SetSaveToName(true, outputDir + Path.DirectorySeparatorChar);
        int status = document.Extension.SavePackAndGo(pack);
        Marshal.FinalReleaseComObject(pack);
        var zipPath = Path.Combine(CreateTaskDirectory(task.Id), "pack-and-go.zip");
        System.IO.Compression.ZipFile.CreateFromDirectory(outputDir, zipPath);
        artifacts.Add(new(zipPath, "application/zip"));
        return new(new { status }, artifacts);
    }

    private dynamic GetApplication()
    {
        if (_application is not null) return _application;
        var type = Type.GetTypeFromProgID("SldWorks.Application") ?? throw new InvalidOperationException("未检测到 SolidWorks。请安装 SolidWorks 2026 或兼容版本。");
        _application = Activator.CreateInstance(type) ?? throw new InvalidOperationException("SolidWorks 启动失败。");
        _application.Visible = true;
        return _application;
    }

    private static int DetectDocumentType(string path) => Path.GetExtension(path).ToLowerInvariant() switch
    {
        ".sldprt" => 1,
        ".sldasm" => 2,
        ".slddrw" => 3,
        _ => 0,
    };

    public void TryCleanTaskDirectory(string taskId)
    {
        try { Directory.Delete(Path.Combine(_workRoot, taskId), true); } catch { }
    }

    public void Dispose()
    {
        try { if (_application is not null) { _application.ExitApp(); Marshal.FinalReleaseComObject(_application); } } catch { }
        _application = null;
    }
}
