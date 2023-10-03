using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Amazon.Runtime;
using AwsSignatureVersion4;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddCors();

var credentials = new ECSTaskCredentials();
var region = Environment.GetEnvironmentVariable("AWS_REGION");

builder.Services
    .AddHttpClient("AppSync")
    .AddHeaderPropagation()
    .AddHttpMessageHandler(() => new AwsSignatureHandler(new AwsSignatureHandlerSettings(
        region, "appsync", credentials)));

 builder.Services
    .AddHttpClient("ApiGateway")
    .AddHeaderPropagation()
    .AddHttpMessageHandler(() => new AwsSignatureHandler(new AwsSignatureHandlerSettings(
        region, "execute-api", credentials)));

builder.Services
    .AddWebSocketClient();

builder.Services
    .AddFusionGatewayServer()
    .ConfigureFromFile("./gateway.fgp")
    .CoreBuilder
    .AddInstrumentation(o => o.RenameRootActivity = true);

builder.Services
    .AddOpenTelemetry()
    .ConfigureResource(b => b.AddService("Gateway"))
    .WithTracing(
        b =>
        {
            b.AddHttpClientInstrumentation();
            b.AddAspNetCoreInstrumentation();
            b.AddHotChocolateInstrumentation();
        }
    )
    .WithMetrics(
        b =>
        {
            b.AddHttpClientInstrumentation();
            b.AddAspNetCoreInstrumentation();
        }
    );

builder.Services.AddHealthChecks();

/*
 In order to add OpenID Connect authentication at the gateway level, you can uncomment the following:

services.AddAuthentication(sharedOptions => {
        sharedOptions.DefaultSchema = CookieAuthenticationDefaults.AuthenticationScheme;
        sharedOptions.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
    }).AddCookie()
    .AddOpenIdConnect(options => {
        options.Authority = "https://your-oidc-provider.com";
        options.ClientId = "your-client-id";
        options.ClientSecret = "your-client-secret"; // If applicable
        options.ResponseType = "code";
        options.SaveTokens = true;
    });
*/

var app = builder.Build();

app.UseWebSockets();
app.UseCors(c => c.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin());
app.UseHeaderPropagation();
app.MapGraphQL();
app.MapHealthChecks("/");

// In order to add OpenID Connect authentication at the gateway level, you can uncomment the following:
// app.UseAuthentication(); 

app.RunWithGraphQLCommands(args);