namespace MrMetis.Core.Dtos;

/// <summary>
/// What the client needs to derive its keys and unwrap the data key
/// </summary>
public record KeyMaterial(string Salt, int Iterations, string WrappedKey);
