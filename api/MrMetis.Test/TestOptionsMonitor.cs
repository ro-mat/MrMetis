using Microsoft.Extensions.Options;

namespace MrMetis.Test;

// options that never change, for services that follow appsettings changes
public class TestOptionsMonitor<T>(T value) : IOptionsMonitor<T>
{
    public T CurrentValue => value;

    public T Get(string? name) => value;

    public IDisposable? OnChange(Action<T, string?> listener) => null;
}
