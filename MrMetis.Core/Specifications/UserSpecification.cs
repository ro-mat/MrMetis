using MrMetis.Core.Entities;

namespace MrMetis.Core.Specifications;

public class UserSpecification : BaseSpecification<User>
{
    public UserSpecification(string email)
        : base(x => x.Email.ToLower().Equals(email.ToLower()))
    {
    }

    public UserSpecification(int id) : base(x => x.Id == id)
    {
        AddInclude(x => x.UserData);
    }

}