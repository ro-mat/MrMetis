using System.Collections.Concurrent;
using System.Diagnostics.Metrics;

namespace MrMetis.Infrastructure.Telemetry;

/// <summary>
/// Business counters of the app, exported over OTLP together with the built-in ASP.NET Core metrics
/// </summary>
public sealed class MrMetisMetrics
{
    public const string MeterName = "MrMetis";

    public const string Success = "success";

    private readonly ResultCounter _registrations = new(Success, "emailExists", "codeInvalid", "kdfInvalid");
    private readonly ResultCounter _logins = new(Success, "failed");
    private readonly ResultCounter _passwordChanges = new(Success, "failedLogin", "kdfInvalid");
    private readonly ResultCounter _recoverySets = new(Success, "failedLogin", "recoveryInvalid");
    private readonly ResultCounter _recoveries = new(Success, "recoveryFailed", "kdfInvalid");
    private readonly ResultCounter _rateLimited = new("policy", ["credentials", "prelogin", "account"]);
    private readonly ResultCounter _dataSaves = new(Success, "storageLimitExceeded");
    private readonly Histogram<long> _dataSize;

    public MrMetisMetrics(IMeterFactory meterFactory)
    {
        Meter = meterFactory.Create(MeterName);

        Meter.CreateObservableCounter("mrmetis.registrations", _registrations.Observe, "{registration}",
            "Registration attempts by result, the error code when failed");
        Meter.CreateObservableCounter("mrmetis.logins", _logins.Observe, "{login}",
            "Login attempts by result");
        Meter.CreateObservableCounter("mrmetis.password.changes", _passwordChanges.Observe, "{change}",
            "Password change attempts by result, the error code when failed");
        Meter.CreateObservableCounter("mrmetis.recovery.sets", _recoverySets.Observe, "{set}",
            "Recovery key creations and replacements by result, the error code when failed");
        Meter.CreateObservableCounter("mrmetis.recoveries", _recoveries.Observe, "{recovery}",
            "Recovery attempts (lookups of the wrapped key and password resets) by result, the error code when failed");
        Meter.CreateObservableCounter("mrmetis.rate_limited", _rateLimited.Observe, "{request}",
            "Requests refused for too many attempts, by rate limit policy");
        Meter.CreateObservableCounter("mrmetis.data.saves", _dataSaves.Observe, "{save}",
            "Saves of the encrypted user data by result");
        _dataSize = Meter.CreateHistogram<long>("mrmetis.data.size", "By",
            "Size of the saved encrypted user data");
    }

    /// <summary>
    /// For gauges of other services, see <see cref="UserStatsCollector"/>
    /// </summary>
    public Meter Meter { get; }

    public void Registration(string result) => _registrations.Add(result);

    public void Login(bool success) => _logins.Add(success ? Success : "failed");

    public void PasswordChange(string result) => _passwordChanges.Add(result);

    public void RecoverySet(string result) => _recoverySets.Add(result);

    public void Recovery(string result) => _recoveries.Add(result);

    public void RateLimited(string policy) => _rateLimited.Add(policy);

    public void DataSave(string result, long bytes)
    {
        _dataSaves.Add(result);
        _dataSize.Record(bytes, new KeyValuePair<string, object?>("result", result));
    }

    /// <summary>
    /// Totals per result, all known results reported from the first export on even when still zero:
    /// Prometheus' increase() can't see the first sample of a new series, so the first registration or login
    /// after a deploy would otherwise not be counted
    /// </summary>
    private sealed class ResultCounter
    {
        private readonly ConcurrentDictionary<string, long> _totals = new();
        private readonly string _tag;

        public ResultCounter(params string[] knownResults) : this("result", knownResults)
        {
        }

        public ResultCounter(string tag, string[] knownResults)
        {
            _tag = tag;
            foreach (var result in knownResults)
            {
                _totals[result] = 0;
            }
        }

        public void Add(string result) => _totals.AddOrUpdate(result, 1, (_, total) => total + 1);

        public IEnumerable<Measurement<long>> Observe() =>
            _totals.Select(x => new Measurement<long>(x.Value, new KeyValuePair<string, object?>(_tag, x.Key)));
    }
}
