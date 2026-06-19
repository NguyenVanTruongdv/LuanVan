using System.Net.Http.Json;

public class SmsService : ISmsService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;

    public SmsService(
        HttpClient httpClient,
        IConfiguration config)
    {
        _httpClient = httpClient;
        _config = config;
    }

    public async Task SendOtpAsync(
        string phoneNumber,
        string otp)
    {
        var apiKey = _config["TextBee:ApiKey"];
        var deviceId = _config["TextBee:DeviceId"];

        var url =
            $"https://api.textbee.dev/api/v1/gateway/devices/{deviceId}/send-sms";

        var request = new HttpRequestMessage(
            HttpMethod.Post,
            url);

        request.Headers.Add(
            "x-api-key",
            apiKey);

        request.Content =
            JsonContent.Create(new
            {
                recipients = new[]
                {
                    phoneNumber
                },
                message = $"Ma OTP cua ban la {otp}"
            });

        var response =
            await _httpClient.SendAsync(
                request);

        response.EnsureSuccessStatusCode();
    }
}