# German Tax Refund Interview

Use this interview when the user asks for a German annual tax return estimate,
refund estimate, Nachzahlung estimate, "연말정산 예상 환급액", "tax refund",
"Einkommensteuererklaerung", or similar German personal tax planning.

## Route

Primary route: `steuer-mcp`.

Use `german-law-mcp` as a secondary route only when the user asks for legal
basis, statutory interpretation, deadlines, or source verification.

## Privacy Rule

Do not ask for tax ID, passport number, bank account, exact home address,
employer name, client names, or uploaded payslips unless the user explicitly
wants document-based review. Numeric summaries are enough for an estimate.

## Interview Strategy

Ask only for missing information. Start with the minimal required set, then ask
optional deduction questions if the user wants a better estimate.

### Minimum Required Questions

1. Tax year: which year is being estimated?
2. Filing status: single or joint assessment?
3. German federal state: which Bundesland?
4. Tax class during the year: Steuerklasse I, II, III, IV, V, or VI?
5. Church tax: yes or no?
6. Employment income: annual gross salary or taxable wage from the payslip.
7. Already withheld amounts: Lohnsteuer, Solidaritaetszuschlag, Kirchensteuer
   if available.
8. Health and pension insurance: statutory or private; employee contributions
   if available.

If the user cannot provide withheld taxes, make an explicit rough-estimate
assumption and lower confidence.

### Common Deduction Questions

Ask these after the minimum set:

- Commuting: one-way distance to work and number of office days.
- Home office: number of home-office days.
- Work equipment: laptop, monitor, desk, chair, software, phone, training.
- Professional expenses: union/professional dues, applications, work travel.
- Donations: deductible donations or church donations.
- Child-related items: children, childcare, school fees.
- Moving expenses: work-related move.
- Double household: second household for work.
- Other income: freelance, rental, capital gains, unemployment/parental
  benefits, sickness benefits, short-time work allowance.

## Refund Optimization Tips

Use this checklist proactively. The goal is not to promise a refund, but to
avoid missing common deductible or tax-reducing items. Ask about categories that
match the user's situation, then estimate impact through `steuer-mcp`.

### Work-Related Expenses

- Arbeitnehmer-Pauschbetrag: check whether actual work expenses exceed the
  automatic employee lump sum. If not, detailed work-expense collection may not
  change the result.
- Commuting: ask for one-way distance, office days, public-transport costs, and
  whether a private car was used. Public-transport costs may matter if higher
  than the distance allowance.
- Home office: ask for home-office days and whether there is a separate study
  room. Distinguish the daily home-office allowance from stricter home-office
  room rules.
- Work equipment: ask about laptop, monitor, desk, chair, phone, software,
  books, tools, and professional clothing. Split private/professional use if
  mixed.
- Training and professional development: ask about courses, exams, books,
  travel, professional certifications, and language courses connected to work.
- Professional dues: ask about union dues, chamber fees, professional
  association fees, and job-related legal/professional insurance.
- Application costs: ask about job applications, CV photos, postage, travel to
  interviews, and online application costs.
- Business travel: ask for unreimbursed travel, accommodation, parking, tolls,
  and meal allowances.
- Double household: ask whether the user maintained a second household for work
  and had family-home travel.
- Work-related move: ask whether a move shortened commute or was required by a
  new job.

### Personal Deductions and Credits

- Insurance and pension: ask for health, nursing-care, pension, unemployment,
  liability, disability, and other deductible insurance contributions.
- Donations: ask about charitable donations, church donations, and political
  donations.
- Childcare and children: ask about childcare costs, school fees, child benefit,
  children living abroad, and single-parent status.
- Household services: ask about haushaltsnahe Dienstleistungen, cleaners,
  gardening, care services, and Nebenkostenabrechnung line items.
- Tradesperson costs: ask about Handwerkerleistungen for labor/travel/machine
  costs, not material costs.
- Medical and extraordinary burdens: ask about unreimbursed medical costs,
  dental work, glasses, therapy, care costs, disability, and support payments.
- Pflege and disability lump sums: ask whether the user or a dependent has a
  disability grade or care level.
- Capital income: ask whether Kapitalertragsteuer was withheld and whether the
  Sparer-Pauschbetrag was unused or split inefficiently.
- Losses: ask about study costs, professional training, rental losses,
  freelance losses, or other loss carryforward candidates.

### Situation Flags That Often Change the Result

- Marriage, divorce, separation, or spouse with much lower income.
- Steuerklasse change during the year.
- Parental allowance, unemployment benefit, sickness benefit, Kurzarbeitergeld,
  or other progression-income benefits.
- Change of job, bonus, severance, relocation, or one-off payment.
- Moving between Bundeslaender or church-tax status changes.
- Rental income, cross-border work, foreign income, or double-taxation treaty
  issues.
- Self-employment alongside employment.

### Interview Style

After the minimum required questions, ask:

> "Do you want a quick rough estimate now, or should I run a refund-maximizing
> checklist for common deductions?"

If the user chooses the checklist, group questions by likely impact:

1. commute/home office/work equipment;
2. insurance/pension/donations/children;
3. household services/medical/care/disability;
4. other income, losses, and special situations.

Do not ask every item as a long form. Ask 3-6 compact questions per round and
summarize what is still missing.

## Source Anchors To Verify Current-Year Values

Before giving a precise estimate for a specific tax year, verify current-year
thresholds and formulas through `steuer-mcp`, `german-law-mcp`, or official
sources:

- EStG § 9: Werbungskosten, commuting, work equipment.
- EStG § 9a: Arbeitnehmer-Pauschbetrag.
- EStG § 10 and § 10b: Sonderausgaben and donations.
- EStG § 33 and § 33b: extraordinary burdens, disability and care lump sums.
- EStG § 35a: household services and tradesperson tax reductions.
- EStG § 32a: income tax tariff and Grundfreibetrag.
- BMF Lohnsteuer/Einkommensteuer handbooks for current-year administrative
  tables and guidance.

### Output Shape

After collecting enough data, return:

- selected route: `steuer-mcp`;
- assumptions and missing facts;
- estimated refund or additional payment range;
- main drivers of the estimate;
- confidence: low, medium, or high;
- what would make the estimate more precise;
- professional-review caveat for filing decisions.

## Stop Rule

If the user only wants a quick budget number, do not force every optional
question. Give a rough range after the minimum set and clearly label it as an
estimate.
