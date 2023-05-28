using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MrMetis.Core.Services;
using MrMetis.Core.Interfaces;
using MrMetis.Infrastructure.Contexts;
using Microsoft.EntityFrameworkCore;
using MrMetis.Infrastructure.Helpers;
using Microsoft.AspNetCore.Http;
using MrMetis.Infrastructure.Repositories;
using MrMetis.Core.Interfaces.Base;

namespace MrMetis.Api
{
    public class Startup
    {
        public Startup(IConfiguration configuration, IWebHostEnvironment environment)
        {
            Configuration = configuration;
            Environment = environment;
        }

        public IConfiguration Configuration { get; }
        public IWebHostEnvironment Environment { get; private set; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(
                    builder => builder
                        .WithOrigins(Configuration.GetSection("Settings:Cors").Get<string[]>())
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .Build());
            });

            services.AddControllers()
                .AddNewtonsoftJson();

            services.AddDbContext<MrMetisContext>(options =>
            {
                options.UseSqlServer(Configuration["Database:ConnectionString"]);
                if (IsDevelopment() || IsTest())
                {
                    options.EnableSensitiveDataLogging(); // dev feature
                }
            });

            services.AddAuthentication(x =>
                {
                    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    x.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.RequireHttpsMetadata = false;
                    options.SaveToken = true;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Configuration["Authentication:Jwt:Secret"])),
                        ValidateIssuer = true,
                        ValidIssuer = Configuration["Authentication:Jwt:Issuer"],
                        ValidateAudience = true,
                        ValidAudience = Configuration["Authentication:Jwt:Audience"],
                        RequireExpirationTime = false,
                        ValidateLifetime = true
                    };
                });

            if (!IsDevelopment())
            {
                services.AddSpaStaticFiles(config =>
                {
                    config.RootPath = "front";
                });
            }

            AddServices(services);
        }

        private static void AddServices(IServiceCollection services)
        {
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            services.AddScoped(typeof(IAsyncRepository<>), typeof(MrMetisRepository<>));

            services.AddScoped<IIdentityService, IdentityService>();
            services.AddScoped<IUserDataService, UserDataService>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (IsDevelopment() || IsTest())
            {
                app.UseDeveloperExceptionPage();
            }

            if (IsDevelopment() || IsTest())
            {
                app.CreateDummyDatabaseAndSchema(
                        Configuration["Database:SetupConnectionString"],
                        Configuration["Database:ConnectionString"],
                        Environment.EnvironmentName)
                    .GetAwaiter().GetResult();
            }

            app.UseHsts();
            app.UseHttpsRedirection();

            app.UseStaticFiles();
            app.UseCookiePolicy();

            app.UseCors();

            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });

            if (!IsDevelopment())
            {
                app.UseSpaStaticFiles();
                app.UseSpa(o =>
                {
                    o.Options.SourcePath = "front";
                });
            }
        }

        private bool IsDevelopment() => Environment.IsEnvironment("Development");

        private bool IsTest() => Environment.IsEnvironment("Test");

        private bool IsProduction() => Environment.IsEnvironment("Production");
    }
}
