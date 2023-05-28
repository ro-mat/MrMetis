using Microsoft.AspNetCore.Http;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;

namespace MrMetis.Api
{
    public static class HttpContextHelper
    {

        private static string GetClaimValue(this HttpContext context, string claimName)
        {
            if (!(context.User.Identity is ClaimsIdentity identity))
                return null;

            var val = identity.Claims.SingleOrDefault(x => x.Type == claimName)?.Value;
            return val;
        }

        public static string GetUserEmail(this HttpContext context)
        {
            var email = context.GetClaimValue(ClaimTypes.Email);
            return email;
        }

        public static int? GetUserId(this HttpContext context)
        {
            var claimId = context.GetClaimValue("id");
            if (claimId == null || !int.TryParse(claimId, out int id))
                return null;

            return id;
        }
    }
}
