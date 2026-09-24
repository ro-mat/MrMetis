using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MrMetis.Core.Dtos;
using MrMetis.Core.Services;
using MrMetis.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace MrMetis.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserDataController : Controller
    {
        private readonly IUserDataService _userDataService;

        public UserDataController(IUserDataService userDataService)
        {
            _userDataService = userDataService;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> Get()
        {
            var userId = HttpContext.GetUserId();
            if (userId == null)
                return Unauthorized();

            var result = await _userDataService.GetAsync(userId.Value);
            return Ok(result);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> SetUserData([FromBody] UserDataDto model)
        {
            var userId = HttpContext.GetUserId();
            if (userId == null)
                return Unauthorized();

            var result = await _userDataService.SetAsync(userId.Value, model);
            return Ok(result);
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteStatement(int id)
        {
            var userId = HttpContext.GetUserId();
            if (userId == null)
                return Unauthorized();

            await _userDataService.DeleteAsync(id);
            return Ok();
        }
    }
}