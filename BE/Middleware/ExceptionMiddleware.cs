using BE.Exceptions;
using System.Text.Json;

namespace BE.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ExceptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            // ===== LOG RA CONSOLE =====
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("====================================================");
            Console.WriteLine("                UNHANDLED EXCEPTION");
            Console.WriteLine("====================================================");
            Console.WriteLine($"Time      : {DateTime.Now}");
            Console.WriteLine($"Method    : {context.Request.Method}");
            Console.WriteLine($"Path      : {context.Request.Path}");
            Console.WriteLine($"Query     : {context.Request.QueryString}");
            Console.WriteLine();
            Console.WriteLine($"Message   : {ex.Message}");
            Console.WriteLine();

            if (ex.InnerException != null)
            {
                Console.WriteLine("--------------- INNER EXCEPTION ----------------");
                Console.WriteLine(ex.InnerException);
                Console.WriteLine();
            }

            Console.WriteLine("---------------- STACK TRACE -------------------");
            Console.WriteLine(ex);
            Console.WriteLine("====================================================");
            Console.ResetColor();

            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(
        HttpContext context,
        Exception exception)
    {
        context.Response.ContentType = "application/json";

        context.Response.StatusCode = exception switch
        {
            BadRequestException => StatusCodes.Status400BadRequest,
            UnauthorizedException => StatusCodes.Status401Unauthorized,
            NotFoundException => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status500InternalServerError
        };

        var response = new
        {
            statusCode = context.Response.StatusCode,
            message = exception.Message,
            detail = exception.ToString(),
            inner = exception.InnerException?.ToString(),
            path = context.Request.Path,
            method = context.Request.Method,
            time = DateTime.Now
        };

        await context.Response.WriteAsync(
            JsonSerializer.Serialize(response),
            System.Text.Encoding.UTF8);
    }
}