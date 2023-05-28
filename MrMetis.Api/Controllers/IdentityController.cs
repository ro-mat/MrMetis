using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Requests;
using MrMetis.Core.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace MrMetis.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IdentityController : Controller
    {
        private readonly IConfiguration _config;
        private readonly IIdentityService _identityService;

        public IdentityController(IConfiguration config, IIdentityService identityService)
        {
            _config = config;
            _identityService = identityService;
        }

        [HttpGet("me")]
        [Authorize]
        public IActionResult Me()
        {
            var email = HttpContext.GetUserEmail();
            if (email == null)
                return BadRequest("identity not found :(");

            return Ok(email);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegistrationRequest request)
        {
            var authResponse = await _identityService.RegisterAsync(request.Email, request.Password, request.InvitationCode);

            if (!authResponse.Success)
            {
                return BadRequest(new AuthFailedResponse
                {
                    Errors = authResponse.Errors
                });
            }

            return Ok(new AuthSuccessResponse
            {
                Token = authResponse.Token
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginRequest request)
        {
            var authResponse = await _identityService.LoginAsync(request.Email, request.Password);
            if (!authResponse.Success)
            {
                return BadRequest(new AuthFailedResponse
                {
                    Errors = authResponse.Errors
                });
            }

            return Ok(new AuthSuccessResponse
            {
                Token = authResponse.Token
            });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            if (!(HttpContext.User.Identity is ClaimsIdentity identity))
                return BadRequest("identity not found :(");


            var claim = identity.Claims.ToList();
            var userName = claim[0].Value;
            return Ok(userName);
        }

    }
}
