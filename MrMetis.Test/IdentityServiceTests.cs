using Microsoft.Extensions.Configuration;
using MrMetis.Core.Entities;
using MrMetis.Core.Interfaces;
using MrMetis.Core.Interfaces.Base;
using MrMetis.Core.Services;
using NSubstitute;
using NSubstitute.ReturnsExtensions;
using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace MrMetis.Test
{
    public class IdentityServiceTests
    {
        private IConfiguration _configuration;
        private IAsyncRepository<User> _userRepository;
        private IAsyncRepository<InvitationCode> _invitationCodeRepository;
        private readonly Dictionary<string, string> configSettings = new() { { "Authentication:Jwt:Secret", "BudgetYourLife999" } };

        [SetUp]
        public void Setup()
        {
            _configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(configSettings)
                .Build();
            _userRepository = Substitute.For<IAsyncRepository<User>>();
            _invitationCodeRepository = Substitute.For<IAsyncRepository<InvitationCode>>();
        }

        [Test]
        public async Task Login_WithCorrectData_ShouldReturnCorrectToken()
        {
            // Arrange
            var email = "email@email.com";
            var dbPass = "d7c8efc324bf9028757eb6c21c0f89e132ce05d520d4e52a70c0ed85dbaa0de3";
            var salt = "aslqvigxjd6y2k30kud6i3a67g930yc1";
            var userPass = "8570rglys6qtzb619yiweu9bhtg1o2hhu0qwyn22u52adbdmwkf25wkgf1mzt1ej";

            _userRepository
                .GetAsync(Arg.Any<Expression<Func<User, bool>>>())
                .ReturnsForAnyArgs(new User { Email = email, Password = dbPass, Salt = salt });

            var service = new IdentityService(_configuration, _userRepository, _invitationCodeRepository);

            // Act
            var result = await service.LoginAsync(email, userPass);

            // Assert
            Assert.That(result.Success, Is.True);
            Assert.That(result.Token, Is.Not.Empty);
        }

        [TestCase("bad", "aslqvigxjd6y2k30kud6i3a67g930yc1", "8570rglys6qtzb619yiweu9bhtg1o2hhu0qwyn22u52adbdmwkf25wkgf1mzt1ej")]
        [TestCase("d7c8efc324bf9028757eb6c21c0f89e132ce05d520d4e52a70c0ed85dbaa0de3", "bad", "8570rglys6qtzb619yiweu9bhtg1o2hhu0qwyn22u52adbdmwkf25wkgf1mzt1ej")]
        [TestCase("d7c8efc324bf9028757eb6c21c0f89e132ce05d520d4e52a70c0ed85dbaa0de3", "aslqvigxjd6y2k30kud6i3a67g930yc1", "bad")]
        public async Task Login_WithBadData_ShouldReturnError(string dbPass, string salt, string userPass)
        {
            // Arrange
            var email = "email@email.com";

            _userRepository
                .GetAsync(Arg.Any<Expression<Func<User, bool>>>())
                .ReturnsForAnyArgs(new User { Email = email, Password = dbPass, Salt = salt });

            var service = new IdentityService(_configuration, _userRepository, _invitationCodeRepository);

            // Act
            var result = await service.LoginAsync(email, userPass);

            // Assert
            Assert.That(result.Success, Is.False);
            Assert.That(result.Token, Is.Null);
            Assert.That(result.Errors, Is.Not.Null);
            Assert.That(result.Errors.Count, Is.EqualTo(1));
            Assert.That(result.Errors.First(), Is.EqualTo("failedLogin"));
        }

        [Test]
        public async Task Login_WithBadEmail_ShouldReturnError()
        {
            // Arrange
            _userRepository
                .GetAsync(Arg.Any<Expression<Func<User, bool>>>())
                .ReturnsNullForAnyArgs();

            var service = new IdentityService(_configuration, _userRepository, _invitationCodeRepository);

            // Act
            var result = await service.LoginAsync("any", "any");

            // Assert
            Assert.That(result.Success, Is.False);
            Assert.That(result.Token, Is.Null);
            Assert.That(result.Errors, Is.Not.Null);
            Assert.That(result.Errors.Count, Is.EqualTo(1));
            Assert.That(result.Errors.First(), Is.EqualTo("failedLogin"));
        }
    }
}