using Microsoft.AspNetCore.Diagnostics;
using MrMetis.Core.Exceptions;

namespace MrMetis.Api.ExceptionHandling;

/// <summary>
/// Returns expected domain errors as 400 ProblemDetails, the error code is the title
/// </summary>
public sealed class MrMetisExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not MrMetisException)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails =
            {
                Status = StatusCodes.Status400BadRequest,
                Title = exception.Message
            }
        });
    }
}
