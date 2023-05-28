using Microsoft.EntityFrameworkCore;
using MrMetis.Core.Entities.Base;
using MrMetis.Core.Interfaces;
// using Z.EntityFramework.Plus;
using System.Linq;
using System;

namespace MrMetis.Infrastructure
{
    public class SpecificationEvaluator<T> where T : BaseEntity
    {
        public IQueryable<T> GetQuery(IQueryable<T> inputQuery, ISpecification<T> specification)
        {
            if (inputQuery is null)
            {
                throw new ArgumentNullException(nameof(inputQuery));
            }

            if (specification is null)
            {
                throw new ArgumentNullException(nameof(specification));
            }

            var query = inputQuery;

            if (specification.AsNoTracking)
            {
                query.AsNoTracking();
            }

            // modify the IQueryable using the specification's criteria expression
            if (specification.Criteria != null)
            {
                query = query.Where(specification.Criteria);
            }

            // Includes all expression-based includes
            query = specification.Includes.Aggregate(query,
                                    (current, include) => current.Include(include));

            // Include any string-based include statements
            query = specification.IncludeStrings.Aggregate(query,
                                    (current, include) => current.Include(include));

            // // Include any optimized include statements
            // query = specification.IncludeOptimizeds.Aggregate(query,
            //                         (current, include) => current.IncludeOptimized(include));

            // // Include any string-based optimized include statements
            // query = specification.IncludeOptimizedStrings.Aggregate(query,
            //             (current, include) => current.IncludeOptimizedByPath(include));

            // Apply paging if enabled
            if (specification.IsPagingEnabled)
            {
                query = query.Skip(specification.Skip)
                             .Take(specification.Take);
            }
            return query;
        }
    }
}