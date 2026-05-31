using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace BlazorApp.Components.Pages;

public partial class Home : ComponentBase
{
    [Inject] private IJSRuntime JS { get; set; } = default!;

    public record Val(string Title);

    protected Val[] Values { get; } =
    [
        new("Compassion"),
        new("Collaboration"),
        new("Integrity"),
        new("Innovation"),
        new("Empowerment"),
        new("Excellence"),
        new("Cultural Diversity & Inclusivity"),
    ];

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            await JS.InvokeVoidAsync("HBApp.init");
            // Give Blazor a moment to fully hydrate, then force video play
            await Task.Delay(300);
            await JS.InvokeVoidAsync("eval", "var v = document.querySelector('video'); if(v) { v.load(); v.play().catch(()=>{}); }");
        }
    }
}