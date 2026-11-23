"""Techken kit power budget — rough paper-balance model for all 34 kits.

Run:  python3 design/kit_budget.py          (tuned values)
      python3 design/kit_budget.py --before (original v0.1 values)

This is a sanity check, not a simulator. Every number is an *expected* value
(already discounted for how often it realistically lands). Once the TypeScript
sim exists, replace this with CPU-vs-CPU win rates from tools/.

Power (damage-equivalent per second) =
    basic DPS share + skill DPS (limited by Motivation/Tokens) + passive DPS
  + sustain/s + hard CC seconds/s * CC_VALUE + soft utility (UTIL)
"""
import sys

BASIC_SHARE = 0.30   # fraction of a full-charge-basic rhythm that lands in a real fight
CC_VALUE = 40        # 1 s of hard CC ~ one free full-charge hit
REGEN = 6.0          # Motivation per second
HIT_INCOME = 1.0     # extra Motivation/s from landing and taking hits (rough)

# skill tuple: (name, motivation_cost, cooldown_s, expected_dmg, hard_cc_s, sustain_hp)
# kit: basic=(full_dmg, charge_s), mult=damage multiplier from passive,
#      pdps=passive damage/s, psus=passive sustain HP/min, cdr=cooldown reduction,
#      res=extra resource limit factor on skills (Vibe Coder tokens)
KITS = {
 "SE A Strongly Typed":    dict(basic=(75,.8), mult=1.08, skills=[("Semicolon",20,5,40,.3,0),("Brace Cage",30,12,0,.84,0),("Recursion",35,14,90,0,0)]),
 "SE B Exception Handling":dict(basic=(75,.8), psus=150, skills=[("throw Error",20,6,50,0,0),("finally",30,16,55,0,0),("Hotfix",25,18,0,0,80)]),
 "Mobile A Push Notif":    dict(basic=(60,.6), skills=[("Swipe",20,7,40,0,0),("Camera Flash",25,10,20,0,0),("Push",25,8,75,.3,0)]),
 "Mobile B Cross-Platform":dict(basic=(60,.6), mult=1.07, skills=[("Turret",30,12,60,0,0),("Hot Reload",25,16,0,0,60)]),
 "QA A Exploratory":       dict(basic=(65,.7), mult=1.08, skills=[("Magnify",20,8,20,0,0),("Bug",30,15,50,0,0),("Reopen Ticket",35,18,30,0,0)]),
 "QA B Bug Bounty":        dict(basic=(65,.7), mult=1.08, skills=[("Bug Net",20,9,0,.6,0),("Infestation",35,18,40,0,0)]),
 "SysA A Flowchart":       dict(basic=(80,1.0), pdps=4, skills=[("Arrow",20,6,35,0,0),("Swimlane",30,14,15,0,0)]),
 "SysA B Requirements":    dict(basic=(80,1.0), mult=1.15, skills=[("Change Request",20,12,10,0,0),("UML Box",30,15,0,.5,0),("Gap Analysis",25,10,30,0,0)]),
 "NetA A Full Bars":       dict(basic=(60,1.0), mult=1.15, skills=[("Ping",15,4,0,.14,0),("Packet Loss",30,14,0,0,60),("Relocate AP",20,10,0,0,0)]),
 "NetA B Traffic":         dict(basic=(60,1.0), mult=1.05, skills=[("Throttle",30,15,25,0,0),("Signal Jam",25,12,0,.6,0),("Broadcast Storm",40,20,80,0,0)]),
 "DBA A ACID":             dict(basic=(110,1.3), skills=[("SELECT",25,10,0,.3,0),("Table Lock",30,15,0,1.26,0),("ROLLBACK",35,22,0,0,150)]),
 "DBA B Destructive":      dict(basic=(110,1.3), mult=1.12, skills=[("JOIN",25,12,50,0,0),("DROP TABLE",45,24,130,0,0)]),
 "DevOps A CI/CD":         dict(basic=(75,.9), mult=1.10, skills=[("Container",25,12,0,0,40),("Conveyor",30,15,10,0,0),("Push to Prod",30,14,60,0,0)]),
 "DevOps B On-Call":       dict(basic=(75,.9), regen_bonus=2, skills=[("Pod Replicas",35,18,260,0,0),("Rollback Deploy",25,14,0,0,30),("WOMM",20,10,0,0,20)]),
 "Cloud A Weather":        dict(basic=(60,.9), skills=[("Rain",20,7,50,0,0),("Lightning",35,14,110,0,0),("Cumulus",15,8,0,0,0)]),
 "Cloud B Multi-Region":   dict(basic=(60,.9), psus=120, skills=[("Deploy Region",20,10,0,0,0),("Serverless",30,12,70,0,0),("Cold Start",25,16,10,0,0)]),
 "TechSup A Escalation":   dict(basic=(65,.8), skills=[("Customer",30,12,60,0,0),("Manager",35,20,90,.4,0),("Barrage",15,5,40,0,0)]),
 "TechSup B Help Desk":    dict(basic=(65,.8), psus=40, skills=[("Put on Hold",25,10,15,0,0),("Mass Ticket",35,16,60,0,0),("Customer Mob",40,20,60,0,0)]),
 "Cyber A Defense":        dict(basic=(70,.9), psus=120, skills=[("Firewall",25,12,0,0,40),("Mirror",30,15,50,0,20),("Patch",20,14,0,0,90)]),
 "Cyber B Red Team":       dict(basic=(70,.9), mult=1.05, skills=[("Honeypot",25,14,0,.4,0),("Zero-Trust",30,16,40,0,100),("Encrypt",20,12,0,0,20)]),
 "DataSci A Predictive":   dict(basic=(75,.8), mult=1.10, skills=[("Regression",25,8,60,0,0),("Conf. Interval",30,14,50,0,0)]),
 "DataSci B Monte Carlo":  dict(basic=(75,.8), skills=[("Random Sample",20,7,50,0,0),("p<0.05",30,15,35,0,0),("Remove Outliers",35,18,50,0,0)]),
 "AI A Reinforcement":     dict(basic=(55,1.1), skills=[("Deploy Model",30,15,120,0,0),("Fine-Tune",20,10,40,0,0),("Hallucinate",25,12,10,0,20)]),
 "AI B Multi-Agent":       dict(basic=(55,1.1), pdps=8, skills=[("Spawn Agent",20,6,10,0,0),("Agentic Loop",35,16,90,0,0),("Prompt Injection",30,18,0,.75,0)]),
 "BA A Compound Interest": dict(basic=(60,.8), pdps=10, skills=[("Quick Workaround",20,6,30,0,0),("Scope Creep",30,14,30,0,0),("Due Date",40,22,150,0,0)]),
 "BA B Morale Drain":      dict(basic=(60,.8), pdps=6, skills=[("Legacy Code",25,10,25,0,0),("Deprioritize",30,15,30,0,0),("Sign-off",30,16,0,0,80)]),
 "PM A Sprint Board":      dict(basic=(75,1.0), cdr=.30, skills=[("Assign Ticket",20,6,40,0,0),("Code Freeze",40,22,0,1.2,0),("Rewind Sprint",30,18,10,.2,0)]),
 "PM B Timeline":          dict(basic=(75,1.0), skills=[("Move Deadline",25,14,20,0,0),("Fast-Track",25,14,30,0,0),("Backlog",35,18,30,0,0)]),
 "UX A Design System":     dict(basic=(50*1.2,.5), skills=[("Wireframe",25,10,0,0,20),("Drag & Drop",30,14,60,.3,0),("Make It Pop",35,16,75,0,0)]),
 "UX B User Flow":         dict(basic=(50,.5), mult=1.10, skills=[("Grid Snap",20,8,25,0,0),("A/B Test",30,15,0,0,40),("Color Picker",30,18,50,0,0)]),
 "TW A Manual":            dict(basic=(65,.8), psus=60, skills=[("RTFM",25,10,65,.3,0),("Redact",30,16,0,1.0,0),("Footnote",20,8,35,0,0)]),
 "TW B Red Pen":           dict(basic=(65,.8), skills=[("Paragraph",20,10,0,0,20),("Strikethrough",25,9,45,0,0),("Typo",30,14,30,0,0)]),
 "Vibe A Prompt & Pray":   dict(basic=(70,.6), res=.5, skills=[("Generate",10,4,72,0,0),("Accept All",10,12,100,0,0),("Regenerate",5,6,60,0,0)]),
 "Vibe B Ship It Friday":  dict(basic=(70,.6), res=.6, skills=[("Autocomplete",5,3,36,0,0),("YOLO Deploy",15,15,80,0,0),("Touch Grass",0,20,0,0,0)]),
}

# Soft utility the formula can't see (slows, silence, cooldown denial, zoning, walls,
# mobility, decoys), as a hand-estimated damage-equivalent per second.
UTIL = {
 "NetA A Full Bars":5, "NetA B Traffic":5, "PM B Timeline":6, "Cloud B Multi-Region":3,
 "QA B Bug Bounty":4, "QA A Exploratory":3, "TechSup B Help Desk":4, "BA B Morale Drain":5,
 "SysA A Flowchart":2, "SysA B Requirements":2, "TW B Red Pen":3, "Cyber A Defense":1,
 "Mobile A Push Notif":2, "SE A Strongly Typed":1, "AI A Reinforcement":2, "DevOps A CI/CD":3,
 "Cloud A Weather":1, "UX A Design System":2, "UX B User Flow":2, "DBA A ACID":1, "PM A Sprint Board":1,
 "Mobile B Cross-Platform":2, "Cyber B Red Team":2, "DevOps B On-Call":1, "TW A Manual":1,
}

# v0.2 tuning: (kit, field or skill name) -> new value(s)
TUNING = {
 "Vibe A Prompt & Pray":   dict(basic=(60,.6), skills={"Generate":(10,4,64,0,0),"Accept All":(10,12,86,0,0),"Regenerate":(5,6,40,0,0)}),
 "Vibe B Ship It Friday":  dict(basic=(60,.6), skills={"Autocomplete":(5,4,32,0,0)}),
 "DataSci A Predictive":   dict(basic=(60,.8), skills={"Regression":(25,8,55,0,0)}),
 "DataSci B Monte Carlo":  dict(basic=(60,.8)),
 "DevOps B On-Call":       dict(skills={"Pod Replicas":(35,18,85,0,0)}),
 "BA A Compound Interest": dict(pdps=4.5, skills={"Due Date":(40,22,110,0,0)}),
 "BA B Morale Drain":      dict(pdps=4),
 "Cloud B Multi-Region":   dict(psus=80, skills={"Serverless":(30,12,85,0,0)}),
 "PM A Sprint Board":      dict(cdr=.20),
 "UX A Design System":     dict(basic=(50*1.12,.5)),
 "DBA A ACID":             dict(skills={"Table Lock":(30,15,0,1.05,0),"ROLLBACK":(35,22,0,0,120)}),
 "NetA A Full Bars":       dict(basic=(65,1.0), skills={"Ping":(15,4,15,.14,0)}),
 "SysA A Flowchart":       dict(pdps=5, skills={"Arrow":(20,6,45,0,0),"Swimlane":(30,14,15,.2,0)}),
 "QA B Bug Bounty":        dict(skills={"Bug Net":(20,9,25,.6,0)}),
 "AI A Reinforcement":     dict(basic=(60,1.0)),
 "AI B Multi-Agent":       dict(basic=(60,1.0)),
 "Mobile B Cross-Platform":dict(skills={"Turret":(30,12,70,0,0)}),
 "TW B Red Pen":           dict(skills={"Strikethrough":(25,9,50,0,0)}),
 "SE A Strongly Typed":    dict(skills={"Semicolon":(20,5,35,.3,0),"Recursion":(35,14,75,0,0)}),
 "SE B Exception Handling":dict(psus=100, skills={"finally":(30,16,50,0,0),"Hotfix":(25,18,0,0,60)}),
 "TechSup A Escalation":   dict(skills={"Barrage":(15,5,32,0,0)}),
 "Mobile A Push Notif":    dict(skills={"Push":(25,8,60,.3,0)}),
 "NetA B Traffic":         dict(basic=(65,1.0), skills={"Throttle":(30,15,30,0,0),"Broadcast Storm":(40,20,90,0,0)}),
 "PM B Timeline":          dict(skills={"Backlog":(35,18,30,0,0),"Fast-Track":(25,14,40,0,0)}),
}

# v0.2 second pass (merged over the first)
PASS2 = {
 "SE A Strongly Typed":    dict(basic=(70,.8), skills={"Semicolon":(20,6,35,.3,0),"Brace Cage":(30,12,0,.7,0)}),
 "SE B Exception Handling":dict(basic=(70,.8), psus=80, skills={"throw Error":(20,6,42,0,0)}),
 "BA B Morale Drain":      dict(skills={"Sign-off":(30,16,0,0,64),"Deprioritize":(30,15,20,0,0)}),
 "Mobile A Push Notif":    dict(skills={"Swipe":(20,7,35,0,0),"Camera Flash":(25,12,20,0,0)}),
 "Cloud B Multi-Region":   dict(skills={"Deploy Region":(15,10,0,0,0),"Cold Start":(25,16,25,0,0)}),
 "Vibe B Ship It Friday":  dict(skills={"Autocomplete":(5,3,32,0,0),"Touch Grass":(0,16,0,0,0)}),
 "NetA B Traffic":         dict(skills={"Signal Jam":(20,12,0,.6,0)}),
 "PM A Sprint Board":      dict(skills={"Code Freeze":(35,22,0,1.2,0),"Assign Ticket":(20,6,47,0,0)}),
 "DevOps B On-Call":       dict(skills={"Pod Replicas":(35,18,100,0,0)}),
 "DataSci B Monte Carlo":  dict(skills={"Random Sample":(20,7,60,0,0)}),
 "SysA B Requirements":    dict(skills={"Gap Analysis":(25,10,35,0,0)}),
}
for _k, _v in PASS2.items():
    _t = TUNING.setdefault(_k, {})
    for _f, _x in _v.items():
        if _f == "skills":
            _t.setdefault("skills", {}).update(_x)
        else:
            _t[_f] = _x


def apply_tuning(kits):
    out = {}
    for name, k in kits.items():
        k = dict(k)
        t = TUNING.get(name, {})
        for f, v in t.items():
            if f == "skills":
                k["skills"] = [(s[0], *v[s[0]]) if s[0] in v else s for s in k["skills"]]
            else:
                k[f] = v
        out[name] = k
    return out


def score(k):
    full, charge = k["basic"]
    mult = k.get("mult", 1.0)
    basic = full / (charge + 0.3) * BASIC_SHARE
    cdr = k.get("cdr", 0.0)
    sk = k["skills"]
    rate = lambda i: 1 / (sk[i][2] * (1 - cdr))
    drain = sum(s[1] * rate(i) for i, s in enumerate(sk))
    budget = REGEN + HIT_INCOME + k.get("regen_bonus", 0)
    uptime = min(1.0, budget / drain if drain else 1.0) * k.get("res", 1.0)
    sdps = sum(s[3] * rate(i) for i, s in enumerate(sk)) * uptime
    cc = sum(s[4] * rate(i) for i, s in enumerate(sk)) * uptime
    sus = sum(s[5] * rate(i) for i, s in enumerate(sk)) * uptime + k.get("psus", 0) / 60
    dps = (basic + sdps) * mult + k.get("pdps", 0)
    burst = full * mult + sum(s[3] for s in sk) * mult
    power = dps + sus + cc * CC_VALUE + k.get("util", 0)
    return dict(dps=dps, sus=sus, cc=cc * 60, drain=drain / (REGEN + HIT_INCOME), burst=burst, power=power)


def main():
    kits = KITS if "--before" in sys.argv else apply_tuning(KITS)
    rows = {n: score(dict(k, util=UTIL.get(n, 0))) for n, k in kits.items()}
    powers = sorted(r["power"] for r in rows.values())
    med = powers[len(powers) // 2]
    print(f"{'kit':26} {'power':>6} {'vs med':>7} {'dps':>5} {'sus/s':>5} {'CC/min':>6} {'drain':>5} {'burst':>5}")
    for n, r in sorted(rows.items(), key=lambda x: -x[1]["power"]):
        d = (r["power"] / med - 1) * 100
        flag = "  <-- HIGH" if d > 15 else ("  <-- LOW" if d < -15 else "")
        print(f"{n:26} {r['power']:6.1f} {d:+6.0f}% {r['dps']:5.1f} {r['sus']:5.1f} {r['cc']:6.1f} {r['drain']:5.2f} {r['burst']:5.0f}{flag}")
    print(f"\nmedian power {med:.1f}  spread {powers[0]:.1f}–{powers[-1]:.1f}")
    print("drain = skill Motivation spend if every skill is cast on cooldown / income (>1 means burnout pressure)")


if __name__ == "__main__":
    main()
