using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace BlazorApp.Services;

public class EmailService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _toEmail;
    private readonly string _fromEmail;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, HttpClient http, ILogger<EmailService> logger)
    {
        _http      = http;
        _logger    = logger;
        _apiKey    = config["Resend:ApiKey"]    ?? throw new Exception("Resend:ApiKey not configured");
        _toEmail   = config["Resend:ToEmail"]   ?? "info@healingbridgehealth.com";
        _fromEmail = config["Resend:FromEmail"] ?? "noreply@healingbridgehealth.com";
    }

    public async Task<bool> SendContactFormAsync(
        string name, string email, string phone,
        string subject, string message)
    {
        var body = $"""
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> {name}</p>
            <p><strong>Email:</strong> {email}</p>
            <p><strong>Phone:</strong> {(string.IsNullOrEmpty(phone) ? "Not provided" : phone)}</p>
            <p><strong>Subject:</strong> {subject}</p>
            <hr/>
            <p><strong>Message:</strong></p>
            <p>{message.Replace("\n", "<br/>")}</p>
            <hr/>
            <p style="color:#888;font-size:12px">Sent from HealingBridgeHealth.com contact form</p>
            """;

        var payload = new
        {
            from     = $"Healing Bridge Health <{_fromEmail}>",
            to       = new[] { _toEmail },
            reply_to = new[] { email },
            subject  = $"[HBH Contact] {subject} — from {name}",
            html     = body
        };

        var json = JsonSerializer.Serialize(payload);
        _logger.LogInformation("Sending email via Resend. Payload: {Json}", json);

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _http.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        _logger.LogInformation("Resend response: {StatusCode} — {Body}",
            (int)response.StatusCode, responseBody);

        if (!response.IsSuccessStatusCode)
            _logger.LogError("Resend failed: {StatusCode} {Body}", (int)response.StatusCode, responseBody);

        return response.IsSuccessStatusCode;
    }
}