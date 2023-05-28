using System;

namespace MrMetis.Core.Exceptions;

public class MrMetisException : Exception
{
    public MrMetisException(string message)
            : base(message)
    {
    }

    public MrMetisException(string message, Exception innerException)
        : base(message, innerException)
    {

    }
}