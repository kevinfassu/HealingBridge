using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
using BlazorApp.Services;

namespace BlazorApp.Components.Pages;

public partial class Contact : ComponentBase
{
    [Inject] private IJSRuntime    JS           { get; set; } = default!;
    [Inject] private EmailService  EmailService { get; set; } = default!;

    // Form fields
    protected string FormName    = "";
    protected string FormPhone   = "";
    protected string FormEmail   = "";
    protected string FormSubject = "A patient referral";
    protected string FormMessage = "";

    // UI state
    protected bool   Submitting    = false;
    protected bool   FormSent      = false;
    protected string FormError     = "";

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
            await JS.InvokeVoidAsync("HBApp.init");
    }

    protected async Task HandleSubmit()
    {
        FormError = "";

        // Basic validation
        if (string.IsNullOrWhiteSpace(FormName))
            { FormError = "Please enter your name."; return; }
        if (string.IsNullOrWhiteSpace(FormEmail) || !FormEmail.Contains("@"))
            { FormError = "Please enter a valid email address."; return; }
        if (string.IsNullOrWhiteSpace(FormMessage))
            { FormError = "Please enter a message."; return; }

        Submitting = true;

        try
        {
            var success = await EmailService.SendContactFormAsync(
                FormName, FormEmail, FormPhone, FormSubject, FormMessage);

            if (success)
                FormSent = true;
            else
                FormError = "Something went wrong sending your message. Please call us directly at (747) 271-7001.";
        }
        catch
        {
            FormError = "Something went wrong sending your message. Please call us directly at (747) 271-7001.";
        }
        finally
        {
            Submitting = false;
        }
    }
}