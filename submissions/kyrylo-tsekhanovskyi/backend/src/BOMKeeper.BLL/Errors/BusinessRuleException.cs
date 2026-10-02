namespace BOMKeeper.BLL.Errors;

// A violated business rule. The code names the rule and becomes the problem type `/problems/<code>`.
public sealed class BusinessRuleException : Exception
{
    public const string DuplicateOffer = "duplicate-offer";
    public const string ListingInOtherProject = "listing-in-other-project";

    public BusinessRuleException(string code, string message)
        : base(message) => Code = code;

    public BusinessRuleException()
        : this("business-rule", "A business rule was violated.")
    {
    }

    public BusinessRuleException(string message)
        : this("business-rule", message)
    {
    }

    public BusinessRuleException(string message, Exception innerException)
        : base(message, innerException) => Code = "business-rule";

    public string Code { get; }
}
