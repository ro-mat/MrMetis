using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using MrMetis.Core.Dtos;

namespace MrMetis.Core.Interfaces
{
    public interface ISpecification<T>
    {
        Expression<Func<T, bool>> Criteria { get; }
        List<Expression<Func<T, object>>> Includes { get; }
        List<string> IncludeStrings { get; }
        List<Expression<Func<T, object>>> IncludeOptimizeds { get; }
        List<string> IncludeOptimizedStrings { get; }

        int Take { get; set; }
        int Skip { get; set; }
        bool IsPagingEnabled { get; set; }
        bool AsNoTracking { get; }
    }
}