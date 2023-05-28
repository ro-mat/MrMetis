using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using MrMetis.Core.Helpers.Query;
using MrMetis.Core.Interfaces;

namespace MrMetis.Core.Specifications
{
    public class BaseSpecification<T> : ISpecification<T>
    {
        public Expression<Func<T, bool>> Criteria { get; }
        public List<Expression<Func<T, object>>> Includes { get; set; } = new List<Expression<Func<T, object>>>();
        public List<string> IncludeStrings { get; } = new List<string>();
        public List<Expression<Func<T, object>>> IncludeOptimizeds { get; set; } = new List<Expression<Func<T, object>>>();
        public List<string> IncludeOptimizedStrings { get; } = new List<string>();

        public int Take { get; set; }
        public int Skip { get; set; }
        public bool IsPagingEnabled { get; set; } = false;
        public bool AsNoTracking { get; set; } = false;

        public BaseSpecification(Expression<Func<T, bool>>? criteria, params Expression<Func<T, object>>[] includes)
        {
            Criteria = criteria;
            if (includes != null)
            {
                Includes = includes.ToList();
            }
        }

        protected virtual void AddInclude(Expression<Func<T, object>> includeExpression)
        {
            Includes.Add(includeExpression);
        }

        protected virtual void AddIncludes<TProperty>(Func<IncludeAggregator<T>, IIncludeQuery<T, TProperty>> includeGenerator)
        {
            if (includeGenerator is null)
            {
                throw new ArgumentNullException(nameof(includeGenerator));
            }

            var includeQuery = includeGenerator(new IncludeAggregator<T>());
            IncludeStrings.AddRange(includeQuery.Paths);
        }

        protected virtual void AddInclude(string includeString)
        {
            IncludeStrings.Add(includeString);
        }

        // NB!! Optimized includes use EF Plus repo, regular and optimized includes cannot be mixed
        protected virtual void AddIncludeOptimized(Expression<Func<T, object>> includeExpression)
        {
            IncludeOptimizeds.Add(includeExpression);
        }

        protected virtual void AddIncludeOptimizeds<TProperty>(Func<IncludeAggregator<T>, IIncludeQuery<T, TProperty>> includeGenerator)
        {
            if (includeGenerator is null)
            {
                throw new ArgumentNullException(nameof(includeGenerator));
            }

            var includeQuery = includeGenerator(new IncludeAggregator<T>());
            IncludeOptimizedStrings.AddRange(includeQuery.Paths);
        }

        protected virtual void AddIncludeOptimizeds(string includeString)
        {
            IncludeOptimizedStrings.Add(includeString);
        }

        protected virtual void ApplyAsNoTracking()
        {
            AsNoTracking = true;
        }

        public virtual void ApplyPaging(int skip, int take)
        {
            Skip = skip;
            Take = take;
            IsPagingEnabled = true;
        }
    }
}