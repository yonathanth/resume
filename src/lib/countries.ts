// Countries and their international dialing codes, for phone inputs.
// "ISO|Name|Dial" per line; countries sharing a code (e.g. +1, +7) each have their own row.
const RAW = `ET|Ethiopia|251
AF|Afghanistan|93
AL|Albania|355
DZ|Algeria|213
AD|Andorra|376
AO|Angola|244
AG|Antigua and Barbuda|1268
AR|Argentina|54
AM|Armenia|374
AU|Australia|61
AT|Austria|43
AZ|Azerbaijan|994
BS|Bahamas|1242
BH|Bahrain|973
BD|Bangladesh|880
BB|Barbados|1246
BY|Belarus|375
BE|Belgium|32
BZ|Belize|501
BJ|Benin|229
BT|Bhutan|975
BO|Bolivia|591
BA|Bosnia and Herzegovina|387
BW|Botswana|267
BR|Brazil|55
BN|Brunei|673
BG|Bulgaria|359
BF|Burkina Faso|226
BI|Burundi|257
KH|Cambodia|855
CM|Cameroon|237
CA|Canada|1
CV|Cape Verde|238
CF|Central African Republic|236
TD|Chad|235
CL|Chile|56
CN|China|86
CO|Colombia|57
KM|Comoros|269
CG|Congo|242
CD|Congo (DRC)|243
CR|Costa Rica|506
CI|Côte d'Ivoire|225
HR|Croatia|385
CU|Cuba|53
CY|Cyprus|357
CZ|Czechia|420
DK|Denmark|45
DJ|Djibouti|253
DM|Dominica|1767
DO|Dominican Republic|1809
EC|Ecuador|593
EG|Egypt|20
SV|El Salvador|503
GQ|Equatorial Guinea|240
ER|Eritrea|291
EE|Estonia|372
SZ|Eswatini|268
FJ|Fiji|679
FI|Finland|358
FR|France|33
GA|Gabon|241
GM|Gambia|220
GE|Georgia|995
DE|Germany|49
GH|Ghana|233
GR|Greece|30
GD|Grenada|1473
GT|Guatemala|502
GN|Guinea|224
GW|Guinea-Bissau|245
GY|Guyana|592
HT|Haiti|509
HN|Honduras|504
HK|Hong Kong|852
HU|Hungary|36
IS|Iceland|354
IN|India|91
ID|Indonesia|62
IR|Iran|98
IQ|Iraq|964
IE|Ireland|353
IL|Israel|972
IT|Italy|39
JM|Jamaica|1876
JP|Japan|81
JO|Jordan|962
KZ|Kazakhstan|7
KE|Kenya|254
KI|Kiribati|686
KW|Kuwait|965
KG|Kyrgyzstan|996
LA|Laos|856
LV|Latvia|371
LB|Lebanon|961
LS|Lesotho|266
LR|Liberia|231
LY|Libya|218
LI|Liechtenstein|423
LT|Lithuania|370
LU|Luxembourg|352
MO|Macau|853
MG|Madagascar|261
MW|Malawi|265
MY|Malaysia|60
MV|Maldives|960
ML|Mali|223
MT|Malta|356
MH|Marshall Islands|692
MR|Mauritania|222
MU|Mauritius|230
MX|Mexico|52
FM|Micronesia|691
MD|Moldova|373
MC|Monaco|377
MN|Mongolia|976
ME|Montenegro|382
MA|Morocco|212
MZ|Mozambique|258
MM|Myanmar|95
NA|Namibia|264
NR|Nauru|674
NP|Nepal|977
NL|Netherlands|31
NZ|New Zealand|64
NI|Nicaragua|505
NE|Niger|227
NG|Nigeria|234
KP|North Korea|850
MK|North Macedonia|389
NO|Norway|47
OM|Oman|968
PK|Pakistan|92
PW|Palau|680
PS|Palestine|970
PA|Panama|507
PG|Papua New Guinea|675
PY|Paraguay|595
PE|Peru|51
PH|Philippines|63
PL|Poland|48
PT|Portugal|351
PR|Puerto Rico|1787
QA|Qatar|974
RO|Romania|40
RU|Russia|7
RW|Rwanda|250
KN|Saint Kitts and Nevis|1869
LC|Saint Lucia|1758
VC|Saint Vincent and the Grenadines|1784
WS|Samoa|685
SM|San Marino|378
ST|São Tomé and Príncipe|239
SA|Saudi Arabia|966
SN|Senegal|221
RS|Serbia|381
SC|Seychelles|248
SL|Sierra Leone|232
SG|Singapore|65
SK|Slovakia|421
SI|Slovenia|386
SB|Solomon Islands|677
SO|Somalia|252
ZA|South Africa|27
KR|South Korea|82
SS|South Sudan|211
ES|Spain|34
LK|Sri Lanka|94
SD|Sudan|249
SR|Suriname|597
SE|Sweden|46
CH|Switzerland|41
SY|Syria|963
TW|Taiwan|886
TJ|Tajikistan|992
TZ|Tanzania|255
TH|Thailand|66
TL|Timor-Leste|670
TG|Togo|228
TO|Tonga|676
TT|Trinidad and Tobago|1868
TN|Tunisia|216
TR|Türkiye|90
TM|Turkmenistan|993
TV|Tuvalu|688
UG|Uganda|256
UA|Ukraine|380
AE|United Arab Emirates|971
GB|United Kingdom|44
US|United States|1
UY|Uruguay|598
UZ|Uzbekistan|998
VU|Vanuatu|678
VA|Vatican City|379
VE|Venezuela|58
VN|Vietnam|84
YE|Yemen|967
ZM|Zambia|260
ZW|Zimbabwe|263`;

export interface Country {
  iso: string;
  name: string;
  /** Digits only, without the "+". */
  dial: string;
}

const parsed: Country[] = RAW.split("\n").map((line) => {
  const [iso, name, dial] = line.split("|");
  return { iso, name, dial };
});

export const DEFAULT_COUNTRY = parsed[0]; // Ethiopia
/** Ethiopia first (most users), then A–Z. */
export const COUNTRIES: Country[] = [DEFAULT_COUNTRY, ...parsed.slice(1).sort((a, b) => a.name.localeCompare(b.name))];

// Longest codes first, so +1268 wins over +1 and +2519 doesn't match +25.
// On shared codes the main country wins (+1 is the US, +7 Russia) unless one is already chosen.
const PREFERRED = new Set(["US", "RU"]);
const BY_DIAL_LENGTH = [...COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length || Number(PREFERRED.has(b.iso)) - Number(PREFERRED.has(a.iso))
);

/**
 * Splits a stored phone into its country and local part. "+44 20 7946 0000"
 * → UK + "20 7946 0000". A number without "+" (typed before codes existed)
 * is taken as local to `fallback`, with a leading trunk 0 dropped.
 */
export function splitPhone(value: string | null | undefined, fallback: Country = DEFAULT_COUNTRY): { country: Country; local: string } {
  const raw = (value ?? "").trim();
  if (raw.startsWith("+") || raw.startsWith("00")) {
    const digits = raw.replace(/^00/, "").replace(/[^\d]/g, "");
    // Shared codes (+1, +7) keep the country already chosen when it fits.
    const country = digits.startsWith(fallback.dial) ? fallback : BY_DIAL_LENGTH.find((c) => digits.startsWith(c.dial));
    if (country) {
      const rest = raw.replace(/^(\+|00)\s*/, "");
      let skipped = 0;
      let i = 0;
      while (i < rest.length && skipped < country.dial.length) {
        if (/\d/.test(rest[i])) skipped++;
        i++;
      }
      return { country, local: rest.slice(i).replace(/^[\s().-]+/, "") };
    }
  }
  return { country: fallback, local: raw.replace(/^0(?=\d)/, "") };
}

/** "+251 911 234 567" — empty when there's no number. */
export function joinPhone(country: Country, local: string): string {
  const number = local.replace(/^\s+/, "").replace(/^0(?=\d)/, "");
  return number.trim() ? `+${country.dial} ${number}` : "";
}
