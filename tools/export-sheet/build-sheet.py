#!/usr/bin/env python3
"""
Build Care_Home_Cashflow.xlsx — a Scottish care-home funding cashflow model.

The workbook is fully "live": every cell in the Data sheet is an Excel formula that
references the Variables sheet, so tweaking any input recalculates the whole model
and the chart.

Model rules implemented
------------------------
1. Capital thresholds apply to ASSESSED capital (cash + home value), where the home
   is disregarded for the first N weeks after entering care (12-week property
   disregard — Scotland).
2. Above the upper capital limit  -> self-funder.
   Below it                        -> council contributes up to the "standard rate".
3. Free Personal Care (FPC) and Free Nursing Care (FNC) are NOT means-tested:
   the council pays them to the care home regardless of capital, so a self-funder
   pays  fee - FPC - FNC.  They are awarded N weeks after entering care.
4. The NCHC standard rate ALREADY INCLUDES FPC and FNC, so when council-funded the
   council contribution is  standard_rate - assessed_contribution  (no double count).
5. Assessed weekly contribution = (weekly income - personal expenses allowance)
   + tariff income, capped at the standard rate.
   Tariff income = £1 per £250 (or part thereof) of capital over the lower limit.
6. Top-up = fee - standard rate.  If the home accepts the standard rate, top-up = 0.
7. Weekly net change = weekly income - resident's out-of-pocket.
   Cash is drained first; once cash hits 0 the home is drawn down (in practice the
   house must be sold / equity released).
"""

import datetime
from math import ceil

from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.chart.axis import DateAxis
from openpyxl.chart.text import RichText
from openpyxl.drawing.text import CharacterProperties, Paragraph, ParagraphProperties, RichTextProperties
from openpyxl.styles import Alignment, Font, PatternFill

# ----------------------------------------------------------------------------- #
# Parameters (mirror the Variables sheet)
# ----------------------------------------------------------------------------- #
PARAMS = {
    # CARE HOME
    "start_date": datetime.date(2027, 1, 1),
    "fee": 2200.0,           # care home fee per week
    "billing": 4,            # care home fees billed every N weeks, paid upfront
    "prepay": 2,             # care home fees paid up front (weeks) on entry
    "deposit": 2,            # one-off deposit (weeks of fee), returned at the end
    "accepts_std": "Yes",    # home accepts the council standard rate?

    # ASSETS AND INCOME
    "cash": 50000.0,         # starting cash
    "home": 150000.0,        # home value
    "income": 32866.8,       # total income / year, incl. PEA
    "nursing": "No",         # nursing care awarded?

    # GOVERNMENT POLICY
    "std_personal": 930.45,  # council standard rate, personal care only
    "std_nursing": 1074.13,  # council standard rate, incl. nursing care
    "fpc": 260.30,           # Free Personal Care rate / week
    "fnc": 117.10,           # Free Nursing Care rate / week
    "pea": 35.9,             # personal expenses allowance / week
    "upper": 36750.0,        # upper capital limit
    "lower": 22750.0,        # lower capital limit
    "tariff_rate": 1.0,      # £ per £250 of capital over lower limit
    "tariff_band": 250.0,    # £ per tariff band    
    "delay": 10,             # weeks until FPC/FNC awarded
    "disregard": 12,         # weeks the home value is disregarded
    "means_test": 60000.0,   # total wealth at which council starts the means test

}

DURATION_YEARS = 5  # how many years the model/chart covers (re-run script to apply)
WEEKS = DURATION_YEARS * 52


# ----------------------------------------------------------------------------- #
# Python simulation — used to sanity-check the spreadsheet formulas
# ----------------------------------------------------------------------------- #
def simulate(p=PARAMS, weeks=WEEKS):
    income = p["income"] / 52  # total weekly income, incl. PEA
    std = p["std_nursing"] if p["nursing"] == "Yes" else p["std_personal"]
    topup = 0.0 if p["accepts_std"] == "Yes" else p["fee"] - std
    billing = p["billing"]
    prepay = p["prepay"]
    deposit = p["deposit"] * p["fee"]

    cash, home = p["cash"], p["home"]
    cap = cash + home          # smooth capital used for the means test
    ms = {}
    min_cap, min_week = cap, 0

    for w in range(1, weeks + 1):
        fpc = p["fpc"] if w > p["delay"] else 0.0
        fnc = p["fnc"] if (w > p["delay"] and p["nursing"] == "Yes") else 0.0

        # funding status is based on the smooth capital
        if cap > p["upper"]:
            resident = p["fee"] - fpc - fnc
        else:
            if cap > p["lower"]:
                tariff = ceil((cap - p["lower"]) / p["tariff_band"] - 1e-9) * p["tariff_rate"]
            else:
                tariff = 0.0
            contrib = min(income - p["pea"] + tariff, std)
            resident = contrib + topup

        cap_end = cap + income - resident

        # cash flow: prepayWeeks up front, then billing-week lumps in advance;
        # the deposit is held (illiquid) and returned in the final week.
        payment = 0.0
        if w == 1:
            payment = min(prepay, weeks) * resident + deposit
        elif (w - 1 - prepay) % billing == 0:
            payment = min(billing, weeks - (w - 1)) * resident
        if w == weeks:
            payment -= deposit

        cash_end = max(0.0, cash + income - payment)
        home_end = home + min(0.0, cash + income - payment)

        if "council" not in ms and cap_end <= p["upper"]:
            ms["council"] = w
        if "lower" not in ms and cap <= p["lower"]:
            ms["lower"] = w
        if "cash_out" not in ms and cash_end <= 0:
            ms["cash_out"] = w
        if "means" not in ms and cap_end <= p["means_test"]:
            ms["means"] = w
        if cap_end < min_cap:
            min_cap, min_week = cap_end, w

        cash, home, cap = cash_end, home_end, cap_end

    return {
        "income": income,
        "std": std,
        "topup": topup,
        "ms": ms,
        "min_wealth": min_cap,
        "min_week": min_week,
        "final": cap,
    }


# ----------------------------------------------------------------------------- #
# Styling helpers
# ----------------------------------------------------------------------------- #
HEADER_FILL = PatternFill("solid", fgColor="1F4E79")
HEADER_FONT = Font(bold=True, color="FFFFFF")
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")    # light yellow: tweakable
COMPUTED_FILL = PatternFill("solid", fgColor="DDEBF7")  # light blue: computed
BOLD = Font(bold=True)


def style_header(ws, row, ncols):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def set_widths(ws, widths):
    for col, w in widths.items():
        ws.column_dimensions[col].width = w


# ----------------------------------------------------------------------------- #
# Build workbook
# ----------------------------------------------------------------------------- #
def build(path):
    wb = Workbook()

    # ============================== Variables =================================
    vs = wb.active
    vs.title = "Variables"

    vs["A1"], vs["B1"], vs["C1"] = "Setting", "Value", "Notes"
    style_header(vs, 1, 3)

    money2 = "£#,##0.00"
    money0 = "£#,##0"
    V = PARAMS

    # (row, label, value, note, number_format, kind)   kind: "input" | "computed"
    var_rows = [
        (2,  "Care home fee per week", V["fee"], "What the home charges (£/week)", money2, "input"),
        (4,  "Cash savings at start", V["cash"], "£", money0, "input"),
        (5,  "Home value at start", V["home"], "£", money0, "input"),
        (6,  "Income per year", V["income"], "£/year (total, includes PEA)", money0, "input"),
        (8,  "Personal Expenses Allowance (PEA)", V["pea"], "Weekly council subsidy", money2, "input"),
        (9,  "Computed: weekly income", "=B6/52", None, money2, "computed"),
        (10, "Computed: annual income", "=B6", None, money0, "computed"),
        (12, "Free Personal Care (FPC) rate", V["fpc"], "Paid by council regardless of capital (£/week)", money2, "input"),
        (13, "Free Nursing Care (FNC) rate", V["fnc"], "Paid only if nursing care awarded (£/week)", money2, "input"),
        (14, "Nursing care awarded?", V["nursing"], "Yes = FNC paid + higher standard rate; No = personal-only", None, "input"),
        (16, "Council standard rate - personal care only", V["std_personal"], "NCHC rate without nursing (£/week)", money2, "input"),
        (17, "Council standard rate - with nursing", V["std_nursing"], "NCHC rate including nursing care (£/week)", money2, "input"),
        (18, "Upper capital limit", V["upper"], "Above this: self-funder (£)", money0, "input"),
        (19, "Lower capital limit", V["lower"], "Below this: no tariff income (£)", money0, "input"),
        (20, "Tariff income per £250", V["tariff_rate"], "£ per week per £250 (or part) over lower limit", money2, "input"),
        (21, "Tariff band", V["tariff_band"], "£ of capital per tariff band", money0, "input"),
        (22, "Weeks until FPC/FNC awarded", V["delay"], "Personal & nursing care awarded this many weeks after entry", "0", "input"),
        (23, "Care home accepts standard rate?", V["accepts_std"], "Yes = no top-up once council-funded; No = resident pays fee minus standard rate", None, "input"),
        (24, "Date enters care home", V["start_date"], "Used for the date column", "DD/MM/YYYY", "input"),
        (25, "Weeks home value is disregarded", V["disregard"], "12-week property disregard (0 = count immediately)", "0", "input"),
        (26, "Computed: effective standard rate", '=IF(B14="Yes",B17,B16)', "Standard rate (without nursing)", money2, "computed"),
        (27, "Computed: top-up per week", '=IF(B23="Yes",0,B2-B26)', "Fee minus standard rate (0 if home accepts standard rate)", money2, "computed"),
        (28, "Capital level triggering means-test review", V["means_test"], "£ — council reviews finances here, ahead of taking over subsidy at the upper limit", money0, "input"),
        (29, "Chart duration (years)", DURATION_YEARS, "Model & chart length. Change DURATION_YEARS in the script, then re-run to regenerate.", "0", "input"),
        (30, "Care home billing period (weeks, paid upfront)", V["billing"], "Care home fees billed every N weeks, paid at the start of each period", "0", "input"),
        (31, "Care home deposit (weeks, returned at end)", V["deposit"], "One-off deposit = N weeks' fee, held (illiquid) and returned in the final week", "0", "input"),
        (32, "Care home prepay weeks (paid up front)", V["prepay"], "Weeks of fees paid up front on entry, before regular billing", "0", "input"),
    ]
    for row, label, value, note, fmt, kind in var_rows:
        vs.cell(row=row, column=1, value=label).font = BOLD
        c = vs.cell(row=row, column=2, value=value)
        c.fill = INPUT_FILL if kind == "input" else COMPUTED_FILL
        if fmt:
            c.number_format = fmt
        if note:
            vs.cell(row=row, column=3, value=note)

    set_widths(vs, {"A": 38, "B": 16, "C": 72})

    # ============================== Data =====================================
    ts = wb.create_sheet("Data")
    last = 1 + WEEKS
    sim = simulate()
    _start = PARAMS["start_date"]

    def _wk_date(w):
        if not w:
            return "n/a"
        return (_start + datetime.timedelta(weeks=w - 1)).strftime("%d %b %Y")

    means_date = _wk_date(sim["ms"].get("means"))
    upper_date = _wk_date(sim["ms"].get("council"))
    ht = f"MAX($AB$2:$AB${last})"
    me = f"MATCH(TRUE,$Y$2:$Y${last},0)"
    up = f"MATCH(TRUE,$Z$2:$Z${last},0)"
    headers = [
        "Week", "Date",
        "Cash - start", "Home - start", "Assessed capital - start", "Total wealth - start",
        "FPC this week", "FNC this week", "Tariff income", "Assessed contribution",
        "Top-up", "Council pays", "Resident pays", "Net change",
        "Total wealth - end", "Cash - end", "Home - end", "Phase",
        "Upper limit", "Lower limit", "Council contributing?", "Below lower limit?", "Cash exhausted?",
        "Means-test threshold", "Below means-test threshold?",
        "Total wealth <= upper limit?",
        "Capital (assessment) - start", "Capital (assessment) - end", "Care home payment this week",
        f"Means-test crossing (£60K, {means_date})",
        f"Upper crossing (£36,750, {upper_date})",
    ]
    for c, h in enumerate(headers, start=1):
        ts.cell(row=1, column=c, value=h)
    style_header(ts, 1, len(headers))

    n = WEEKS
    for r in range(2, 2 + n):
        w = r - 1

        ts.cell(row=r, column=1, value=w)
        ts.cell(row=r, column=2, value=f"=Variables!$B$24+(A{r}-1)*7")

        if r == 2:
            ts.cell(row=r, column=3, value="=Variables!$B$4")
            ts.cell(row=r, column=4, value="=Variables!$B$5")
            ts.cell(row=r, column=27, value="=Variables!$B$4+Variables!$B$5")
        else:
            ts.cell(row=r, column=3, value=f"=P{r-1}")
            ts.cell(row=r, column=4, value=f"=Q{r-1}")
            ts.cell(row=r, column=27, value=f"=AB{r-1}")

        ts.cell(row=r, column=5, value=f"=C{r}+IF(A{r}>Variables!$B$25,D{r},0)")
        ts.cell(row=r, column=6, value=f"=C{r}+D{r}")
        ts.cell(row=r, column=7, value=f"=IF(A{r}>Variables!$B$22,Variables!$B$12,0)")
        ts.cell(row=r, column=8, value=f'=IF(AND(A{r}>Variables!$B$22,Variables!$B$14="Yes"),Variables!$B$13,0)')
        ts.cell(row=r, column=9,
                value=f"=IF(AA{r}>Variables!$B$18,0,IF(AA{r}>Variables!$B$19,"
                      f"CEILING((AA{r}-Variables!$B$19)/Variables!$B$21,1)*Variables!$B$20,0))")
        ts.cell(row=r, column=10,
                value=f"=IF(AA{r}<=Variables!$B$18,MIN(Variables!$B$9-Variables!$B$8+I{r},Variables!$B$26),0)")
        ts.cell(row=r, column=11, value=f"=IF(AA{r}<=Variables!$B$18,Variables!$B$27,0)")
        ts.cell(row=r, column=12, value=f"=IF(AA{r}>Variables!$B$18,G{r}+H{r},Variables!$B$26-J{r})")
        ts.cell(row=r, column=13, value=f"=IF(AA{r}>Variables!$B$18,Variables!$B$2-G{r}-H{r},J{r}+K{r})")
        ts.cell(row=r, column=14, value=f"=Variables!$B$9-AC{r}")
        ts.cell(row=r, column=15, value=f"=F{r}+N{r}")
        ts.cell(row=r, column=16, value=f"=MAX(0,C{r}+N{r})")
        ts.cell(row=r, column=17, value=f"=D{r}+MIN(0,C{r}+N{r})")
        ts.cell(row=r, column=18,
                value=f'=IF(AA{r}>Variables!$B$18,"Self-funder",'
                      f'IF(AA{r}>Variables!$B$19,"Tariff band - council contributing","Council pays standard rate"))')
        ts.cell(row=r, column=19, value="=Variables!$B$18")
        ts.cell(row=r, column=20, value="=Variables!$B$19")
        ts.cell(row=r, column=21, value=f"=AA{r}<=Variables!$B$18")
        ts.cell(row=r, column=22, value=f"=AA{r}<=Variables!$B$19")
        ts.cell(row=r, column=23, value=f"=P{r}<=0")
        ts.cell(row=r, column=24, value="=Variables!$B$28")
        ts.cell(row=r, column=25, value=f"=AB{r}<=Variables!$B$28")
        ts.cell(row=r, column=26, value=f"=AB{r}<=Variables!$B$18")
        ts.cell(row=r, column=28, value=f"=AA{r}+Variables!$B$9-M{r}")
        ts.cell(row=r, column=29,
                value=f"=IF(A{r}=1,MIN(Variables!$B$32,{n})*M{r}+Variables!$B$31*Variables!$B$2,"
                      f"IF(MOD(A{r}-1-Variables!$B$32,Variables!$B$30)=0,"
                      f"MIN(Variables!$B$30,{n}-(A{r}-1))*M{r},0))"
                      f"-IF(A{r}={n},Variables!$B$31*Variables!$B$2,0)")
        ts.cell(row=r, column=30, value=f"=IF(A{r}={me},{ht},IF(A{r}={me}-1,0,NA()))")
        ts.cell(row=r, column=31, value=f"=IF(A{r}={up},{ht},IF(A{r}={up}-1,0,NA()))")

        # number formats
        ts.cell(row=r, column=2).number_format = "DD/MM/YYYY"
        for c in (3, 4, 5, 6, 15, 16, 17, 19, 20, 24, 27, 28, 30, 31):
            ts.cell(row=r, column=c).number_format = money0
        for c in (7, 8, 9, 10, 11, 12, 13, 14, 29):
            ts.cell(row=r, column=c).number_format = money2

    ts.freeze_panes = "C2"
    set_widths(ts, {
        "A": 7, "B": 12,
        "C": 13, "D": 13, "E": 15, "F": 15,
        "G": 11, "H": 11, "I": 11, "J": 12, "K": 9, "L": 12, "M": 12, "N": 11,
        "O": 15, "P": 13, "Q": 13, "R": 30,
        "S": 11, "T": 11, "U": 12, "V": 12, "W": 11,
        "X": 13, "Y": 12, "Z": 12,
        "AA": 14, "AB": 14, "AC": 13,
        "AD": 16, "AE": 16,
    })

    # ============================== Chart ====================================
    ss = wb.create_sheet("Chart")
    ss["A1"] = "Key milestones (live — recalculated from the Variables sheet)"
    ss["A1"].font = Font(bold=True, size=13)

    end = 1 + n  # last data row
    sumrows = [
        ("Total weekly income", f"=Variables!B9", money2),
        ("Effective council standard rate", f"=Variables!B26", money2),
        ("Top-up per week (0 if home accepts standard rate)", f"=Variables!B27", money2),
        ("Total wealth at start", f"=Variables!B4+Variables!B5", money0),
        ("", "", None),
        ("Week cash runs out  ->  home must be sold", f'=IF(COUNTIF(Data!W2:W{end},TRUE)=0,"Never",MATCH(TRUE,Data!W2:W{end},0))', "0"),
        ("Week total wealth falls to £60K (means-test review)", f"=MATCH(TRUE,Data!Y2:Y{end},0)", "0"),
        ("Means-test crossing date (£60K)", f'=TEXT(INDEX(Data!$B$2:$B${end},MATCH(TRUE,Data!$Y$2:$Y${end},0)),"dd mmm yyyy")', None),
        ("Week council takes over funding (total wealth <= upper limit)", f"=MATCH(TRUE,Data!Z2:Z{end},0)", "0"),
        ("Upper-threshold crossing date (£36,750)", f'=TEXT(INDEX(Data!$B$2:$B${end},MATCH(TRUE,Data!$Z$2:$Z${end},0)),"dd mmm yyyy")', None),
        ("Week total wealth first falls to lower limit", f'=IF(COUNTIF(Data!V2:V{end},TRUE)=0,"Never - capital stabilises",MATCH(TRUE,Data!V2:V{end},0))', "0"),
        ("Minimum total wealth reached", f"=MIN(Data!AB2:AB{end})", money0),
        (f"Total wealth at end of {DURATION_YEARS} years", f"=INDEX(Data!AB2:AB{end},{n})", money0),
    ]
    for i, (label, formula, fmt) in enumerate(sumrows, start=3):
        ss.cell(row=i, column=1, value=label).font = BOLD
        if formula:
            cell = ss.cell(row=i, column=2, value=formula)
            if fmt:
                cell.number_format = fmt

    set_widths(ss, {"A": 58, "B": 22})

    # ============================== Chart =====================================
    chart = LineChart()
    chart.title = "Capital over time (weekly)"
    chart.style = 2
    chart.height = 14
    chart.width = 32
    chart.legend.position = "b"
    chart.x_axis = DateAxis(axId=10)
    chart.x_axis.title = "Date"
    chart.x_axis.number_format = "mmm yyyy"
    chart.x_axis.txPr = RichText(
        bodyPr=RichTextProperties(rot=-1800000, vert="horz"),
        p=[Paragraph(pPr=ParagraphProperties(defRPr=CharacterProperties(sz=800)), endParaRPr=CharacterProperties(sz=800))],
    )
    chart.y_axis.title = "£"
    chart.y_axis.scaling.min = 0

    chart.add_data(Reference(ts, min_col=28, min_row=1, max_col=28, max_row=end), titles_from_data=True)
    chart.add_data(Reference(ts, min_col=16, min_row=1, max_col=16, max_row=end), titles_from_data=True)
    chart.add_data(Reference(ts, min_col=17, min_row=1, max_col=17, max_row=end), titles_from_data=True)
    chart.add_data(Reference(ts, min_col=19, min_row=1, max_col=19, max_row=end), titles_from_data=True)
    chart.add_data(Reference(ts, min_col=20, min_row=1, max_col=20, max_row=end), titles_from_data=True)
    chart.add_data(Reference(ts, min_col=24, min_row=1, max_col=24, max_row=end), titles_from_data=True)
    chart.add_data(Reference(ts, min_col=30, min_row=1, max_col=30, max_row=end), titles_from_data=True)
    chart.add_data(Reference(ts, min_col=31, min_row=1, max_col=31, max_row=end), titles_from_data=True)
    chart.set_categories(Reference(ts, min_col=2, min_row=2, max_row=end))

    colours = [("1F4E79", 21000), ("2E8B57", 15000), ("ED7D31", 15000), ("C00000", 12000), ("C00000", 12000), ("7030A0", 12000), ("FFC000", 15000), ("FF0000", 15000)]
    for idx, (colour, width) in enumerate(colours):
        s = chart.series[idx]
        s.graphicalProperties.line.solidFill = colour
        s.graphicalProperties.line.width = width
    for idx in (3, 4, 5):
        chart.series[idx].graphicalProperties.line.dashStyle = "dash"

    ss.add_chart(chart, "A14")

    # ============================== Notes =====================================
    nt = wb.create_sheet("Notes")
    notes = [
        "How this model works (Scotland)",
        "",
        "1. FUNDING STATUS uses TOTAL wealth = cash + home value.",
        "   - Total wealth above the UPPER limit  -> self-funder.",
        "   - Total wealth at or below it         -> council contributes up to the standard rate.",
        "   The 'Assessed capital' column also shows the 12-week property disregard (home",
        "   excluded for the first N weeks); it is informational for self-funders.",
        "",
        "2. FREE PERSONAL / NURSING CARE are not means-tested.",
        "   The council pays FPC (and FNC if nursing is awarded) to the care home regardless of capital.",
        "   So a self-funder pays:  fee - FPC - FNC.",
        "   FPC/FNC are awarded N weeks after entering care (set on the Variables sheet).",
        "",
        "3. NO DOUBLE COUNTING: the NCHC standard rate already includes FPC and FNC.",
        "   When council-funded the council pays:  standard rate - assessed contribution.",
        "   (It does NOT pay standard rate plus FPC/FNC on top.)",
        "",
        "4. ASSESSED WEEKLY CONTRIBUTION (council-funded residents) =",
        "   (weekly income - personal expenses allowance) + tariff income, capped at the standard rate.",
        "   Tariff income = 1 per 250 (or part of 250) of assessed capital over the lower limit.",
        "",
        "5. TOP-UP = fee - standard rate.",
        "   If 'Care home accepts standard rate?' = Yes, the top-up is waived (0).",
        "   If No, the resident pays the top-up every week and capital may eventually run out.",
        "",
        "6. CASH FLOW: prepay weeks are paid up front on entry, then fees are billed in",
        "   N-week lumps paid in advance, so cash dips at the start of each billing block.",
        "   A deposit is also held (illiquid) and returned in the final week. Cash is spent",
        "   first; once cash hits 0 the home value is drawn down (the house must be sold or",
        "   equity released at that point).",
        "",
        "7. INCOME vs CAPITAL: the upper/lower limits apply to CAPITAL only.",
        "   Income (total, including the PEA) is used for the weekly contribution, not the thresholds.",
        "",
        "8. MEANS-TEST REVIEW: when total wealth falls to the review threshold (default 60,000)",
        "   the council carries out the financial assessment, ahead of taking over the subsidy",
        "   at the upper capital limit (36,750).",
        "",
        "9. 12-WEEK DISREGARD: the funding boundary uses TOTAL wealth (cash + home), so the",
        "   home is counted from day one for 'when does the council take over'. The disregard",
        "   still appears in the 'Assessed capital' column and would only matter if council",
        "   funding began within the first 12 weeks (not the case here).",
        "",
        "10. BILLING: 'prepay weeks' are paid up front on entry, then fees are billed in",
        "    N-week lumps paid in advance (see 'Care home billing period'); the deposit is",
        "    returned at the end. The 'Capital (assessment)' columns track wealth smoothly,",
        "    so funding milestones are unaffected by lump timing; the Cash/Home columns show",
        "    the lumpy cash-flow (and the extra upfront buffer needed).",
        "",
        "Assumptions / caveats",
        "- Rates and limits are as supplied; update them each April on the Variables sheet.",
        "- Income is counted in full and tax is ignored.",
        "- The home is assumed unoccupied (no qualifying relative) so it counts as capital.",
        "- A real local-authority financial assessment may vary; treat this as a planning model.",
    ]
    for i, line in enumerate(notes, start=1):
        c = nt.cell(row=i, column=1, value=line)
        if line and line[0].isdigit() or line.startswith("How") or line.startswith("Assumptions"):
            c.font = BOLD
        c.alignment = Alignment(wrap_text=True, vertical="top")
    set_widths(nt, {"A": 110})

    wb.move_sheet("Chart", -1)  # tab order: Variables, Chart, Data, Notes

    wb.save(path)
    return path


if __name__ == "__main__":
    out = "exports/Care_Home_Cashflow.xlsx"
    build(out)

    s = simulate()
    print("=== Simulation of default variables ===")
    print(f"Weekly income           : £{s['income']:,.2f}")
    print(f"Effective standard rate : £{s['std']:,.2f}")
    print(f"Top-up per week         : £{s['topup']:,.2f}")
    print(f"Cash runs out (week)    : {s['ms'].get('cash_out', 'never')}")
    print(f"Means-test review (£60K): week {s['ms'].get('means', 'never')}")
    print(f"Council takes over      : week {s['ms'].get('council', 'never')}")
    print(f"Lower limit reached     : week {s['ms'].get('lower', 'never')}")
    print(f"Minimum total wealth    : £{s['min_wealth']:,.2f} (week {s['min_week']})")
    print(f"Wealth after {DURATION_YEARS} years: £{s['final']:,.2f}")
    print(f"Wrote {out}")
