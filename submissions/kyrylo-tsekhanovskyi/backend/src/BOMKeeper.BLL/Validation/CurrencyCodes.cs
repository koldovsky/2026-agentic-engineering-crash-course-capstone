using System.Collections.Frozen;

namespace BOMKeeper.BLL.Validation;

// Active ISO 4217 alphabetic codes (List One), snapshot of 2025-07-01 (after XCG replaced ANG and ZWG
// replaced ZWL). Kept in code so validation does not depend on ICU or culture data (design D3, ADR 0002).
// By the human's decision of 2026-09-30 (design D3), the special codes are excluded, because they are
// not currencies a seller prices in: XXX, XTS, the precious metals XAU/XAG/XPT/XPD, the bond-market units
// XBA–XBD, XDR, XSU, XUA, and the fund codes BOV, CHE, CHW, CLF, COU, MXV, USN, UYI, UYW.
internal static class CurrencyCodes
{
    private static readonly FrozenSet<string> Active = new[]
    {
        "AED", "AFN", "ALL", "AMD", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD",
        "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP",
        "CNY", "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR",
        "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF",
        "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF", "KPW",
        "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD",
        "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK",
        "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB",
        "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SOS", "SRD", "SSP", "STN", "SVC",
        "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD",
        "UYU", "UZS", "VED", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XCG", "XOF", "XPF", "YER", "ZAR",
        "ZMW", "ZWG",
    }.ToFrozenSet(StringComparer.Ordinal);

    public static bool IsActive(string code) => Active.Contains(code);
}
