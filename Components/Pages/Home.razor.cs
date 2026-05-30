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
        }
    }
}
