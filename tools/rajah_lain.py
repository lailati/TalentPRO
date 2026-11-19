#!/usr/bin/env python3
"""Rajah lain untuk tesis: ERD kaki gagak, carta alir, kes guna, kitaran Agile, seni bina.

Satu model -> SVG + .drawio.   python tools/rajah_lain.py [folder_Bab4] [folder_Bab3]
"""
import math
import os
import sys
from xml.sax.saxutils import escape

FONT = "Arial, Helvetica, sans-serif"


def wrap(text, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + " " + w).strip()
    if cur:
        lines.append(cur)
    return lines


class Scene:
    def __init__(self, w, h):
        self.w, self.h, self.items = w, h, []
        self.n = 0

    # ---- unsur
    def box(self, kind, x, y, w, h, text="", fill="#ffffff", stroke="#111111", fs=13, bold=False, dashed=False, sw=1.6, align="center"):
        self.n += 1
        it = dict(t="box", id="n%d" % self.n, kind=kind, x=x, y=y, w=w, h=h, text=text, fill=fill, stroke=stroke, fs=fs, bold=bold, dashed=dashed, sw=sw, align=align)
        self.items.append(it)
        return it

    def line(self, pts, arrow=True, dashed=False, label="", lp=None, anchor="middle", color="#111111", fs=12, sw=1.5, start=None, end=None, bg=True):
        self.n += 1
        it = dict(t="line", id="e%d" % self.n, pts=pts, arrow=arrow, dashed=dashed, label=label, lp=lp, anchor=anchor, color=color, fs=fs, sw=sw, start=start, end=end, bg=bg)
        self.items.append(it)
        return it

    def text(self, x, y, text, fs=13, bold=False, anchor="middle", color="#111111", italic=False):
        self.n += 1
        it = dict(t="text", id="t%d" % self.n, x=x, y=y, text=text, fs=fs, bold=bold, anchor=anchor, color=color, italic=italic)
        self.items.append(it)
        return it

    def raw(self, svg="", drawio=""):
        self.items.append(dict(t="raw", svg=svg, drawio=drawio))

    # ---- SVG
    def svg(self):
        o = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" font-family="%s">' % (self.w, self.h, self.w, self.h, FONT),
             '<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>',
             '<rect width="100%" height="100%" fill="#fff"/>']
        for it in self.items:
            if it["t"] == "box":
                o.append(self._svg_box(it))
            elif it["t"] == "line":
                o.append(self._svg_line(it))
            elif it["t"] == "text":
                st = ' font-weight="bold"' if it["bold"] else ""
                st += ' font-style="italic"' if it["italic"] else ""
                for i, ln in enumerate(it["text"].split("\n")):
                    o.append('<text x="%g" y="%g" text-anchor="%s" font-size="%g" fill="%s"%s>%s</text>' % (it["x"], it["y"] + i * it["fs"] * 1.25, it["anchor"], it["fs"], it["color"], st, escape(ln)))
            elif it["t"] == "raw":
                o.append(it["svg"])
        o.append("</svg>")
        return "\n".join(o)

    def _svg_box(self, b):
        x, y, w, h, k = b["x"], b["y"], b["w"], b["h"], b["kind"]
        da = ' stroke-dasharray="7 4"' if b["dashed"] else ""
        common = 'fill="%s" stroke="%s" stroke-width="%g"%s' % (b["fill"], b["stroke"], b["sw"], da)
        if k == "rect":
            s = '<rect x="%g" y="%g" width="%g" height="%g" %s/>' % (x, y, w, h, common)
        elif k == "round":
            s = '<rect x="%g" y="%g" width="%g" height="%g" rx="12" %s/>' % (x, y, w, h, common)
        elif k == "term":
            s = '<rect x="%g" y="%g" width="%g" height="%g" rx="%g" %s/>' % (x, y, w, h, h / 2, common)
        elif k == "decision":
            s = '<polygon points="%g,%g %g,%g %g,%g %g,%g" %s/>' % (x + w / 2, y, x + w, y + h / 2, x + w / 2, y + h, x, y + h / 2, common)
        elif k == "io":
            sk = 18
            s = '<polygon points="%g,%g %g,%g %g,%g %g,%g" %s/>' % (x + sk, y, x + w, y, x + w - sk, y + h, x, y + h, common)
        elif k == "ellipse":
            s = '<ellipse cx="%g" cy="%g" rx="%g" ry="%g" %s/>' % (x + w / 2, y + h / 2, w / 2, h / 2, common)
        elif k == "group":
            s = '<rect x="%g" y="%g" width="%g" height="%g" rx="10" %s/>' % (x, y, w, h, common)
        elif k == "actor":
            cx = x + w / 2
            s = ('<circle cx="%g" cy="%g" r="11" fill="%s" stroke="%s" stroke-width="1.8"/>' % (cx, y + 12, b["fill"], b["stroke"]) +
                 '<path d="M%g,%g L%g,%g M%g,%g L%g,%g M%g,%g L%g,%g M%g,%g L%g,%g" stroke="%s" stroke-width="1.8" fill="none"/>' % (
                     cx, y + 23, cx, y + 52, cx - 20, y + 33, cx + 20, y + 33, cx, y + 52, cx - 16, y + 76, cx, y + 52, cx + 16, y + 76, b["stroke"]))
            s += '<text x="%g" y="%g" text-anchor="middle" font-size="%g" font-weight="bold">%s</text>' % (cx, y + 96, b["fs"], escape(b["text"]))
            return s
        else:
            raise ValueError(k)
        if b["text"]:
            if k == "group":
                s += '<text x="%g" y="%g" text-anchor="middle" font-size="%g" font-weight="bold">%s</text>' % (x + w / 2, y + 26, b["fs"] + 3, escape(b["text"]))
            else:
                cpl = max(6, int((w - (40 if k in ("decision", "io") else 16)) / (b["fs"] * 0.52)))
                lines = []
                for part in b["text"].split("\n"):
                    lines += wrap(part, cpl)
                lh = b["fs"] * 1.25
                top = y + h / 2 - lh * (len(lines) - 1) / 2 + b["fs"] * 0.35
                wt = ' font-weight="bold"' if b["bold"] else ""
                for i, ln in enumerate(lines):
                    ax = x + w / 2 if b["align"] == "center" else x + 12
                    an = "middle" if b["align"] == "center" else "start"
                    s += '<text x="%g" y="%g" text-anchor="%s" font-size="%g"%s>%s</text>' % (ax, top + i * lh, an, b["fs"], wt, escape(ln))
        return s

    def _svg_line(self, e):
        d = "M" + " L".join("%g,%g" % p for p in e["pts"])
        da = ' stroke-dasharray="6 4"' if e["dashed"] else ""
        me = ' marker-end="url(#a)"' if e["arrow"] else ""
        ms = ' marker-start="url(#a)"' if e.get("start") == "arrow" else ""
        s = '<path d="%s" fill="none" stroke="%s" stroke-width="%g"%s%s%s/>' % (d, e["color"], e["sw"], da, me, ms)
        s += cardinality_svg(e)
        if e["label"]:
            lp = e["lp"] or mid_of(e["pts"])
            w = len(e["label"]) * e["fs"] * 0.56 + 8
            rx = lp[0] - w / 2 if e["anchor"] == "middle" else (lp[0] if e["anchor"] == "start" else lp[0] - w)
            if e["bg"]:
                s += '<rect x="%g" y="%g" width="%g" height="%g" fill="#fff"/>' % (rx, lp[1] - e["fs"] * 0.75, w, e["fs"] * 1.4)
            s += '<text x="%g" y="%g" text-anchor="%s" font-size="%g" fill="%s">%s</text>' % (lp[0], lp[1] + e["fs"] * 0.35, e["anchor"], e["fs"], e["color"], escape(e["label"]))
        return s

    # ---- draw.io
    def drawio(self, name):
        cells = []
        for it in self.items:
            if it["t"] == "box":
                cells.append(self._dio_box(it))
            elif it["t"] == "line":
                cells.append(self._dio_line(it))
            elif it["t"] == "text":
                cells.append('<mxCell id="%s" value="%s" style="text;html=1;align=%s;verticalAlign=middle;fontSize=%g;%s%s" vertex="1" parent="1"><mxGeometry x="%g" y="%g" width="10" height="%g" as="geometry"/></mxCell>' % (
                    it["id"], escape(it["text"].replace("\n", "<br>")), "center" if it["anchor"] == "middle" else ("left" if it["anchor"] == "start" else "right"),
                    it["fs"], "fontStyle=%d;" % ((1 if it["bold"] else 0) + (2 if it["italic"] else 0)), "", it["x"] - 5, it["y"] - it["fs"], it["fs"] * 1.6))
            elif it["t"] == "raw":
                cells.append(it["drawio"])
        return ('<mxfile host="app.diagrams.net"><diagram name="%s"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" page="1" pageScale="1" '
                'pageWidth="%d" pageHeight="%d" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>%s</root></mxGraphModel></diagram></mxfile>' % (escape(name), self.w, self.h, "".join(cells)))

    def _dio_box(self, b):
        k = b["kind"]
        base = {"rect": "rounded=0;", "round": "rounded=1;arcSize=12;", "term": "rounded=1;arcSize=50;", "decision": "rhombus;",
                "io": "shape=parallelogram;perimeter=parallelogramPerimeter;", "ellipse": "ellipse;",
                "group": "rounded=1;arcSize=3;verticalAlign=top;fontStyle=1;", "actor": "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;"}[k]
        st = "%swhiteSpace=wrap;html=1;fontSize=%g;strokeWidth=%g;fillColor=%s;strokeColor=%s;%s%s" % (
            base, b["fs"] + (3 if k == "group" else 0), b["sw"], b["fill"], b["stroke"], "dashed=1;" if b["dashed"] else "", "fontStyle=1;" if b["bold"] else "")
        if b["align"] != "center":
            st += "align=left;spacingLeft=8;"
        geo = (b["x"], b["y"], b["w"], b["h"]) if k != "actor" else (b["x"] + b["w"] / 2 - 20, b["y"], 40, 80)
        return '<mxCell id="%s" value="%s" style="%s" vertex="1" parent="1"><mxGeometry x="%g" y="%g" width="%g" height="%g" as="geometry"/></mxCell>' % (
            b["id"], escape(b["text"].replace("\n", "<br>")), st, *geo)

    def _dio_line(self, e):
        a, b = e["pts"][0], e["pts"][-1]
        mid = "".join('<mxPoint x="%g" y="%g"/>' % p for p in e["pts"][1:-1])
        endA = "classic" if e["arrow"] else "none"
        extra = e.get("dio_style", "")
        st = "endArrow=%s;startArrow=%s;html=1;rounded=0;strokeWidth=%g;fontSize=%g;labelBackgroundColor=#ffffff;strokeColor=%s;%s%s" % (
            endA, "classic" if e.get("start") == "arrow" else "none", e["sw"], e["fs"], e["color"], "dashed=1;" if e["dashed"] else "", extra)
        pts = e["pts"]
        sd = ' source="%s" target="%s"' % (e["src_id"], e["dst_id"]) if e.get("src_id") else ""
        return ('<mxCell id="%s" value="%s" style="%s" edge="1" parent="1"%s><mxGeometry relative="1" as="geometry"><mxPoint x="%g" y="%g" as="sourcePoint"/>'
                '<mxPoint x="%g" y="%g" as="targetPoint"/><Array as="points">%s</Array></mxGeometry></mxCell>' % (e["id"], escape(e["label"]), st, sd, a[0], a[1], b[0], b[1], mid))


def mid_of(pts):
    best, bi = 0, 0
    for i in range(len(pts) - 1):
        l = abs(pts[i + 1][0] - pts[i][0]) + abs(pts[i + 1][1] - pts[i][1])
        if l > best:
            best, bi = l, i
    return ((pts[bi][0] + pts[bi + 1][0]) / 2, (pts[bi][1] + pts[bi + 1][1]) / 2)


# ------------------------------------------------------------- kaki gagak (ERD)
def _unit(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l = math.hypot(dx, dy) or 1
    return dx / l, dy / l


def crow(kind, p, d, color="#111"):
    """Simbol kardinaliti pada titik p (di tepi entiti); d = vektor unit menjauhi entiti."""
    ux, uy = d
    nx, ny = -uy, ux
    pt = lambda t, s=0: (p[0] + ux * t + nx * s, p[1] + uy * t + ny * s)
    out = []

    def seg(a, b):
        out.append('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="%s" stroke-width="1.6"/>' % (a[0], a[1], b[0], b[1], color))

    def bar(t):
        seg(pt(t, -7), pt(t, 7))

    def circ(t):
        c = pt(t)
        out.append('<circle cx="%g" cy="%g" r="5" fill="#fff" stroke="%s" stroke-width="1.6"/>' % (c[0], c[1], color))

    if kind == "one":
        bar(10)
        bar(16)
    elif kind == "zero_one":
        bar(10)
        circ(21)
    elif kind == "zero_many":
        seg(pt(14), pt(0, -8))
        seg(pt(14), pt(0, 8))
        seg(pt(14), pt(0, 0))
        circ(21)
    elif kind == "one_many":
        seg(pt(14), pt(0, -8))
        seg(pt(14), pt(0, 8))
        seg(pt(14), pt(0, 0))
        bar(19)
    return "".join(out)


def cardinality_svg(e):
    if not e.get("card"):
        return ""
    a, b = e["card"]
    pts = e["pts"]
    s = ""
    if a:
        s += crow(a, pts[0], _unit(pts[0], pts[1]))
    if b:
        s += crow(b, pts[-1], _unit(pts[-1], pts[-2]))
    return s


DIO_ER = {"one": "ERmandOne", "zero_one": "ERzeroToOne", "zero_many": "ERzeroToMany", "one_many": "ERoneToMany"}

ATTRS = {
    "users": [("PK", "id"), ("", "username"), ("", "email"), ("", "full_name"), ("", "role"), ("", "department"), ("", "status"),
              ("", "salt"), ("", "password_hash"), ("", "last_login"), ("", "created_at"), ("", "updated_at")],
    "lecturers": [("PK", "id"), ("FK", "user_id"), ("", "staff_id"), ("", "full_name"), ("", "email"), ("", "department"), ("", "position"),
                  ("", "phone"), ("", "location"), ("", "bio"), ("", "photo"), ("", "grade"), ("", "grade_since"), ("", "appointed_on"),
                  ("", "confirmed_on"), ("", "vk7_since"), ("", "field"), ("", "has_phd"), ("", "has_prof_qual"), ("", "employment"),
                  ("", "syarahan_perdana"), ("", "monograf"), ("", "scopus_h_index"), ("", "created_at"), ("", "updated_at")],
    "activities": [("PK", "id"), ("FK", "lecturer_id"), ("", "kind"), ("", "title"), ("", "year"), ("", "level"), ("", "role"), ("", "student"),
                   ("", "graduated"), ("", "semester"), ("", "workload_met"), ("", "blended"), ("", "score"), ("", "terms"),
                   ("FK", "document_id"), ("", "created_at"), ("", "updated_at")],
    "research": [("PK", "id"), ("FK", "lecturer_id"), ("", "title"), ("", "area"), ("", "category"), ("", "year"), ("", "status"),
                 ("", "description"), ("FK", "document_id"), ("", "role"), ("", "grant_source"), ("", "amount"), ("", "registered_ppi"),
                 ("", "created_at"), ("", "updated_at")],
    "publications": [("PK", "id"), ("FK", "lecturer_id"), ("", "title"), ("", "type"), ("", "venue"), ("", "year"), ("", "status"),
                     ("", "doi"), ("FK", "document_id"), ("", "indexing"), ("", "author_role"), ("", "created_at"), ("", "updated_at")],
    "consultancy": [("PK", "id"), ("FK", "lecturer_id"), ("", "project"), ("", "client"), ("", "role"), ("", "year"), ("", "status"),
                    ("", "description"), ("FK", "document_id"), ("", "kind"), ("", "amount"), ("", "registered_ppi"), ("", "created_at"), ("", "updated_at")],
    "achievements": [("PK", "id"), ("FK", "lecturer_id"), ("", "name"), ("", "category"), ("", "year"), ("", "description"),
                     ("FK", "document_id"), ("", "created_at"), ("", "updated_at")],
    "documents": [("PK", "id"), ("FK", "lecturer_id"), ("", "doc_type"), ("", "title"), ("", "file_name"), ("", "mime"), ("", "size"),
                  ("", "file_ref"), ("", "created_at"), ("", "updated_at")],
    "lppt_scores": [("PK", "id"), ("FK", "lecturer_id"), ("", "year"), ("", "score"), ("", "created_at"), ("", "updated_at")],
    "disciplinary": [("PK", "id"), ("FK", "lecturer_id"), ("", "case_no"), ("", "penalty"), ("", "date"), ("", "note"),
                     ("", "created_at"), ("", "updated_at")],
}
RECS = ["activities", "research", "publications", "consultancy", "achievements"]


def entity(sc, name, x, y, w, full, fs):
    rows = [r for r in ATTRS[name] if full or r[0]]
    rh = fs + 7
    hh = fs + 14
    h = hh + len(rows) * rh + 6
    sc.n += 1
    eid = "ent_%s" % name
    # SVG
    s = '<rect x="%g" y="%g" width="%g" height="%g" fill="#fff" stroke="#111" stroke-width="1.6"/>' % (x, y, w, h)
    s += '<rect x="%g" y="%g" width="%g" height="%g" fill="#e8e8e8" stroke="#111" stroke-width="1.6"/>' % (x, y, w, hh)
    s += '<text x="%g" y="%g" text-anchor="middle" font-size="%g" font-weight="bold">%s</text>' % (x + w / 2, y + hh / 2 + fs * 0.36, fs + 1, name)
    dio = ['<mxCell id="%s" value="%s" style="swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=%g;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;fillColor=#e8e8e8;strokeWidth=2;fontSize=%g;html=1;" vertex="1" parent="1"><mxGeometry x="%g" y="%g" width="%g" height="%g" as="geometry"/></mxCell>' % (eid, name, hh, fs + 1, x, y, w, h)]
    for i, (mk, at) in enumerate(rows):
        ry = y + hh + 3 + i * rh
        if mk:
            s += '<text x="%g" y="%g" font-size="%g" font-weight="bold">%s</text>' % (x + 7, ry + rh * 0.72, fs - 1, mk)
        s += '<text x="%g" y="%g" font-size="%g"%s>%s</text>' % (x + 34, ry + rh * 0.72, fs, ' text-decoration="underline"' if mk == "PK" else "", at)
        dio.append('<mxCell id="%s_r%d" value="%s" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=6;spacingRight=4;overflow=hidden;html=1;fontSize=%g;" vertex="1" parent="%s"><mxGeometry y="%g" width="%g" height="%g" as="geometry"/></mxCell>' % (
            eid, i, escape(("%s   %s" % (mk, at)).strip()), fs, eid, hh + 3 + i * rh, w, rh))
    sc.raw(s, "".join(dio))
    return dict(name=name, id=eid, x=x, y=y, w=w, h=h)


def er_edge(sc, ents, a, b, pts, card):
    """Garis hubungan antara entiti a dan b; kad = (simbol di hujung a, simbol di hujung b)."""
    e = sc.line(pts, arrow=False, sw=1.6)
    e["card"] = card

    def anchor(en, p, tag):
        ex, ey = en["x"], en["y"]
        if abs(p[0] - ex) < 1:
            fx, fy = 0, (p[1] - ey) / en["h"]
        elif abs(p[0] - (ex + en["w"])) < 1:
            fx, fy = 1, (p[1] - ey) / en["h"]
        elif abs(p[1] - ey) < 1:
            fx, fy = (p[0] - ex) / en["w"], 0
        else:
            fx, fy = (p[0] - ex) / en["w"], 1
        return "%sX=%g;%sY=%g;%sPerimeter=0;" % (tag, fx, tag, fy, tag)

    e["dio_style"] = "startArrow=%s;endArrow=%s;startSize=14;endSize=14;edgeStyle=none;%s%s" % (
        DIO_ER[card[0]], DIO_ER[card[1]], anchor(ents[a], pts[0], "exit"), anchor(ents[b], pts[-1], "entry"))
    e["src_id"], e["dst_id"] = ents[a]["id"], ents[b]["id"]
    return e


def erd(full):
    fs = 14 if not full else 12
    w = 190 if not full else 210
    gap = 26
    sc = Scene(1100, 800)
    x0 = 40
    pitch = w + gap
    sc.w = x0 * 2 + 5 * w + 4 * gap + 70
    ents = {}
    # baris 1: documents, baris 2: lima jadual rekod, baris 3: lecturers dan users, baris 4: lppt, disciplinary
    def height(n):
        rows = [r for r in ATTRS[n] if full or r[0]]
        return fs + 14 + len(rows) * (fs + 7) + 6

    y1 = 30
    cx = x0 + (5 * w + 4 * gap) / 2
    ents["documents"] = entity(sc, "documents", cx - w / 2, y1, w, full, fs)
    y2 = y1 + height("documents") + 90
    for i, n in enumerate(RECS):
        ents[n] = entity(sc, n, x0 + i * pitch, y2, w, full, fs)
    maxb = max(ents[n]["y"] + ents[n]["h"] for n in RECS)
    y3 = maxb + 95
    lw = 250 if not full else 270
    ents["lecturers"] = entity(sc, "lecturers", cx - lw / 2, y3, lw, full, fs)
    ents["users"] = entity(sc, "users", x0, y3, w, full, fs)
    y4 = y3 + ents["lecturers"]["h"] + 75
    pw = 190 if not full else 210
    ents["lppt_scores"] = entity(sc, "lppt_scores", cx - 110 - pw / 2, y4, pw, full, fs)
    ents["disciplinary"] = entity(sc, "disciplinary", cx + 110 - pw / 2, y4, pw, full, fs)
    sc.h = int(y4 + max(ents["lppt_scores"]["h"], ents["disciplinary"]["h"]) + 40)

    D, L = ents["documents"], ents["lecturers"]
    # documents -> jadual rekod (bas di bawah documents)
    n = 5
    slot = [D["x"] + (i + 1) * D["w"] / (n + 1) for i in range(n)]
    ybase = D["y"] + D["h"]
    ybus = [ybase + 22, ybase + 40, None, ybase + 40, ybase + 22]
    for i, nm in enumerate(RECS):
        R = ents[nm]
        tx = R["x"] + R["w"] / 2
        if i == 2:
            tx = slot[2]
            pts = [(slot[2], ybase), (slot[2], R["y"])]
            R_pt_x = slot[2]
        else:
            pts = [(slot[i], ybase), (slot[i], ybus[i]), (tx, ybus[i]), (tx, R["y"])]
        er_edge(sc, ents, "documents", nm, pts, ("zero_one", "zero_many"))
    # lecturers -> jadual rekod (bas di atas lecturers)
    slotL = [L["x"] + (i + 1) * L["w"] / (n + 1) for i in range(n)]
    for i, nm in enumerate(RECS):
        R = ents[nm]
        rb = R["y"] + R["h"]
        tx = R["x"] + R["w"] / 2
        # y bas: unik per laluan, menaik ke arah tengah
        ys = [y3 - 24, y3 - 42, y3 - 24 - 0, y3 - 42, y3 - 24]
        yb = [y3 - 22, y3 - 40, None, y3 - 40, y3 - 22][i]
        if i == 2:
            pts = [(slotL[2], L["y"]), (slotL[2], rb)]
            if abs(slotL[2] - tx) > 1:
                pts = [(slotL[2], L["y"]), (slotL[2], y3 - 31), (tx, y3 - 31), (tx, rb)]
        else:
            pts = [(slotL[i], L["y"]), (slotL[i], yb), (tx, yb), (tx, rb)]
        er_edge(sc, ents, "lecturers", nm, pts, ("one", "zero_many"))
    # users 1 - 0..1 lecturers
    U = ents["users"]
    yy = U["y"] + 40
    er_edge(sc, ents, "users", "lecturers", [(U["x"] + U["w"], yy), (L["x"], yy)], ("one", "zero_one"))
    # lecturers -> documents (laluan kanan)
    xr = ents["achievements"]["x"] + w + 36
    yl = L["y"] + 40
    er_edge(sc, ents, "lecturers", "documents", [(L["x"] + L["w"], yl), (xr, yl), (xr, D["y"] + 30), (D["x"] + D["w"], D["y"] + 30)], ("one", "zero_many"))
    # lecturers -> lppt, disciplinary
    P1, P2 = ents["lppt_scores"], ents["disciplinary"]
    er_edge(sc, ents, "lecturers", "lppt_scores", [(P1["x"] + P1["w"] / 2, L["y"] + L["h"]), (P1["x"] + P1["w"] / 2, P1["y"])], ("one", "zero_many"))
    er_edge(sc, ents, "lecturers", "disciplinary", [(P2["x"] + P2["w"] / 2, L["y"] + L["h"]), (P2["x"] + P2["w"] / 2, P2["y"])], ("one", "zero_many"))
    sc.ents = ents
    # legenda
    lx, ly = x0, sc.h - 120 if sc.h > 520 else 400
    return sc


def legend_er(sc, x, y):
    items = [("one", "Satu sahaja (wajib)"), ("zero_one", "Sifar atau satu"), ("zero_many", "Sifar atau banyak"), ("one_many", "Satu atau banyak")]
    s = '<rect x="%g" y="%g" width="230" height="%g" fill="#fff" stroke="#999" stroke-width="1"/>' % (x, y, 26 + 26 * len(items))
    s += '<text x="%g" y="%g" font-size="12" font-weight="bold">Petunjuk kardinaliti</text>' % (x + 10, y + 18)
    for i, (k, t) in enumerate(items):
        yy = y + 38 + 26 * i
        s += '<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="#111" stroke-width="1.6"/>' % (x + 12, yy, x + 70, yy)
        s += crow(k, (x + 70, yy), (-1, 0))
        s += '<text x="%g" y="%g" font-size="12">%s</text>' % (x + 84, yy + 4, t)
    sc.raw(s, "")


# --------------------------------------------------------------------- carta alir
def flow_pensyarah():
    sc = Scene(760, 1250)
    cx, w = 280, 280
    BW, BH = w, 54
    def node(kind, y, text, h=BH, **kw):
        return sc.box(kind, cx - w / 2, y, w, h, text, **kw)

    n_start = node("term", 20, "Mula", h=40)
    n_io = node("io", 100, "Masukkan ID pengguna dan kata laluan")
    n_dec = sc.box("decision", cx - 110, 190, 220, 90, "Maklumat sah?")
    n_err = sc.box("round", 560 - 70, 207, 190, 56, "Papar mesej ralat")
    n_prof = node("round", 330, "Kemas kini profil dan maklumat perkhidmatan")
    n_rec = node("round", 420, "Isi rekod kriteria KP dan muat naik dokumen sokongan", h=64)
    n_lppt = node("round", 520, "Isi markah LPPT dan rekod tatatertib")
    n_gred = node("io", 610, "Pilih gred sasaran")
    n_sem = node("round", 700, "Sistem menyemak kriteria dan memaparkan bar kemajuan", h=64)
    n_dec2 = sc.box("decision", cx - 120, 810, 240, 100, "Semua kriteria dipenuhi?")
    n_fix = sc.box("round", 560 - 70, 835, 190, 64, "Lengkapkan perkara yang belum dipenuhi")
    n_sum = node("round", 960, "Jana ringkasan rekod (cetak atau muat turun)", h=60)
    n_man = node("rect", 1060, "Hantar borang ke pejabat FSTP secara manual (di luar sistem)", h=64, dashed=True)
    n_end = node("term", 1170, "Tamat", h=40)

    mx = lambda n: n["x"] + n["w"] / 2
    bot = lambda n: n["y"] + n["h"]
    mid = lambda n: n["y"] + n["h"] / 2

    def down(a, b, label=""):
        sc.line([(cx, bot(a)), (cx, b["y"])], label=label, lp=(cx + 14, (bot(a) + b["y"]) / 2) if label else None, anchor="start")

    down(n_start, n_io)
    down(n_io, n_dec)
    down(n_dec, n_prof, "Ya")
    down(n_prof, n_rec)
    down(n_rec, n_lppt)
    down(n_lppt, n_gred)
    down(n_gred, n_sem)
    down(n_sem, n_dec2)
    down(n_dec2, n_sum, "Ya")
    down(n_sum, n_man)
    down(n_man, n_end)
    # tidak sah -> ralat -> kembali ke input
    sc.line([(cx + 110, mid(n_dec)), (n_err["x"], mid(n_err))], label="Tidak", lp=(cx + 125, mid(n_dec) - 12), anchor="start")
    sc.line([(mx(n_err), n_err["y"]), (mx(n_err), mid(n_io)), (n_io["x"] + n_io["w"] - 9, mid(n_io))])
    # tidak lengkap -> lengkapkan -> kembali ke isi rekod
    sc.line([(cx + 120, mid(n_dec2)), (n_fix["x"], mid(n_fix) if False else mid(n_dec2))], label="Tidak", lp=(cx + 134, mid(n_dec2) - 12), anchor="start")
    n_fix["y"] = mid(n_dec2) - n_fix["h"] / 2
    sc.line([(mx(n_fix), n_fix["y"]), (mx(n_fix), mid(n_rec)), (n_rec["x"] + n_rec["w"], mid(n_rec))])
    return sc


def flow_admin():
    sc = Scene(820, 1180)
    cx, w = 330, 280
    def node(kind, y, text, h=54, **kw):
        return sc.box(kind, cx - w / 2, y, w, h, text, **kw)
    mx = lambda n: n["x"] + n["w"] / 2
    bot = lambda n: n["y"] + n["h"]
    mid = lambda n: n["y"] + n["h"] / 2

    n_start = node("term", 20, "Mula", h=40)
    n_io = node("io", 100, "Masukkan ID pengguna dan kata laluan")
    n_dec = sc.box("decision", cx - 110, 190, 220, 90, "Maklumat sah?")
    n_err = sc.box("round", 600 - 70, 207, 190, 56, "Papar mesej ralat")
    n_home = node("round", 330, "Papar halaman utama Admin")
    n_pick = sc.box("decision", cx - 120, 430, 240, 100, "Pilih fungsi")
    n_user = sc.box("round", 20, 610, 250, 84, "Urus pengguna: cipta akaun, import CSV, tetapkan kata laluan, nyahaktif atau padam")
    n_chk = sc.box("round", 400, 610, 250, 84, "Semak kelengkapan rekod pensyarah: papar senarai lengkap dan tidak lengkap")
    n_more = sc.box("decision", cx - 120, 770, 240, 100, "Teruskan urusan lain?")
    n_out = node("round", 940, "Log keluar")
    n_end = node("term", 1040, "Tamat", h=40)

    def down(a, b, label=""):
        sc.line([(cx, bot(a)), (cx, b["y"])], label=label, lp=(cx + 14, (bot(a) + b["y"]) / 2) if label else None, anchor="start")
    down(n_start, n_io)
    down(n_io, n_dec)
    down(n_dec, n_home, "Ya")
    down(n_home, n_pick)
    down(n_more, n_out, "Tidak")
    down(n_out, n_end)
    sc.line([(cx + 110, mid(n_dec)), (n_err["x"], mid(n_err))], label="Tidak", lp=(cx + 125, mid(n_dec) - 12), anchor="start")
    sc.line([(mx(n_err), n_err["y"]), (mx(n_err), mid(n_io)), (n_io["x"] + n_io["w"] - 9, mid(n_io))])
    # cabang pilihan
    sc.line([(cx - 120, mid(n_pick)), (mx(n_user), mid(n_pick)), (mx(n_user), n_user["y"])], label="Pengguna", lp=(mx(n_user) - 10, mid(n_pick) - 12), anchor="end")
    sc.line([(cx + 120, mid(n_pick)), (mx(n_chk), mid(n_pick)), (mx(n_chk), n_chk["y"])], label="Semakan rekod", lp=(mx(n_chk) + 10, mid(n_pick) - 12), anchor="start")
    # gabung ke keputusan seterusnya
    ym = 735
    sc.line([(mx(n_user), bot(n_user)), (mx(n_user), ym), (cx, ym), (cx, n_more["y"])])
    sc.line([(mx(n_chk), bot(n_chk)), (mx(n_chk), ym), (cx, ym)], arrow=False)
    # ya -> kembali ke halaman utama
    xr = 740
    sc.line([(cx + 120, mid(n_more)), (xr, mid(n_more)), (xr, mid(n_home)), (n_home["x"] + n_home["w"], mid(n_home))], label="Ya", lp=(cx + 134, mid(n_more) - 12), anchor="start")
    return sc


# ------------------------------------------------------------------- Bab 3
def usecase():
    sc = Scene(1100, 780)
    BL, BR = 265, 880            # bas penyambung kiri / kanan
    sc.box("group", 230, 20, 660, 640, "Sistem TalentPro", fill="#eaf3ff", stroke="#2b4d8f", fs=14, sw=2)
    ell = lambda cx, cy, t, w=250, h=56: sc.box("ellipse", cx - w / 2, cy - h / 2, w, h, t, fill="#ffffff", stroke="#2b4d8f", fs=12, sw=1.5)
    uc = {}
    uc["login"] = ell(560, 90, "Log Masuk", 200, 52)
    uc["auth"] = ell(560, 175, "Sahkan Pengguna", 200, 52)
    pen = [("profil", "Kemas Kini Profil dan Maklumat Perkhidmatan"), ("rekod", "Urus Rekod Kriteria KP dan Dokumen Sokongan"),
           ("lppt", "Rekod Markah LPPT dan Tatatertib"), ("gred", "Pilih Gred Sasaran"), ("maju", "Lihat Bar Kemajuan dan Senarai Semak"),
           ("ring", "Cetak atau Muat Turun Ringkasan Rekod")]
    adm = [("user", "Urus Pengguna"), ("csv", "Import Akaun CSV"), ("pass", "Tetapkan Kata Laluan"), ("lengkap", "Semak Kelengkapan Rekod Pensyarah")]
    y = 290
    for k, t in pen:
        uc[k] = ell(430, y, t, 270, 52)
        y += 62
    y = 330
    for k, t in adm:
        uc[k] = ell(735, y, t, 250, 52)
        y += 76
    sc.box("actor", 70, 400, 80, 100, "Pensyarah", fs=14)
    sc.box("actor", 950, 400, 80, 100, "Admin", fs=14)
    cy = lambda u: u["y"] + u["h"] / 2
    col = "#2b4d8f"
    lk = ["login"] + [k for k, _ in pen]
    sc.line([(110, 440), (BL, 440)], arrow=False, sw=1.4, color=col)
    sc.line([(BL, cy(uc["login"])), (BL, cy(uc["ring"]))], arrow=False, sw=1.4, color=col)
    for k in lk:
        sc.line([(BL, cy(uc[k])), (uc[k]["x"], cy(uc[k]))], arrow=False, sw=1.4, color=col)
    rk = ["login"] + [k for k, _ in adm]
    sc.line([(990, 440), (BR, 440)], arrow=False, sw=1.4, color=col)
    sc.line([(BR, cy(uc["login"])), (BR, cy(uc["lengkap"]))], arrow=False, sw=1.4, color=col)
    for k in rk:
        sc.line([(BR, cy(uc[k])), (uc[k]["x"] + uc[k]["w"], cy(uc[k]))], arrow=False, sw=1.4, color=col)
    sc.line([(560, uc["login"]["y"] + 52), (560, uc["auth"]["y"])], dashed=True, label="«include»", lp=(575, 133), anchor="start", sw=1.3, color=col, fs=11)
    sc.box("rect", 40, 690, 620, 64, "", fill="#ffffff", stroke="#999999", sw=1)
    sc.text(54, 712, "Petunjuk:", fs=12, bold=True, anchor="start")
    sc.line([(54, 734), (110, 734)], arrow=False, sw=1.4, color=col)
    sc.text(120, 738, "Hubungan (asosiasi)", fs=12, anchor="start")
    sc.line([(300, 734), (360, 734)], dashed=True, sw=1.3, color=col)
    sc.text(370, 738, "«include»: fungsi wajib dipanggil", fs=12, anchor="start")
    return sc


def agile():
    sc = Scene(1180, 840)
    sc.box("ellipse", 410, 280, 360, 260, "TalentPro\nPembangunan Agile\n(Kitaran Berulang)", fill="#e3efff", stroke="#2b4d8f", fs=18, bold=True, sw=2)
    ph = [
        ("1. Perancangan", "Kenal pasti masalah dan objektif\nTetapkan skop (Admin dan Pensyarah)\nSediakan senarai keperluan (backlog)", "#dbeafe", 410, 20),
        ("2. Analisis Keperluan", "Kaji Garis Panduan KP UPNM 2025\nKenal pasti keperluan fungsian\ndan bukan fungsian", "#dcfce7", 840, 130),
        ("3. Reka Bentuk", "Rajah konteks dan DFD\nERD, carta hierarki, carta alir\nReka bentuk antara muka", "#fef3c7", 840, 430),
        ("4. Pembangunan", "Bangunkan modul mengikut\nsprint (HTML, CSS, JavaScript,\nPHP dan MySQL)", "#ede9fe", 410, 600),
        ("5. Pengujian", "Ujian fungsi (black-box)\nUjian integrasi modul\nPenilaian kebolehgunaan", "#fee2e2", 20, 430),
        ("6. Penambahbaikan", "Semak maklum balas penyelia\ndan pengguna\nBaiki dan ulang kitaran", "#ccfbf1", 20, 130),
    ]
    for t, body, col, x, y in ph:
        sc.box("round", x, y, 320, 170, "", fill=col, stroke="#2b4d8f", sw=1.8)
        sc.text(x + 160, y + 40, t, fs=17, bold=True)
        sc.text(x + 160, y + 78, body, fs=13)
    c = "#2b4d8f"
    sc.line([(730, 105), (1000, 105), (1000, 130)], sw=3, color=c)
    sc.line([(1000, 300), (1000, 430)], sw=3, color=c)
    sc.line([(1000, 600), (1000, 685), (730, 685)], sw=3, color=c)
    sc.line([(410, 685), (180, 685), (180, 600)], sw=3, color=c)
    sc.line([(180, 430), (180, 300)], sw=3, color=c)
    sc.line([(180, 130), (180, 105), (410, 105)], sw=3, color=c)
    sc.text(590, 815, "Setiap kitaran menghasilkan penambahan fungsi yang boleh diuji sebelum kitaran seterusnya bermula", fs=13, italic=True)
    return sc


def arch():
    sc = Scene(1000, 560)
    sc.box("group", 20, 40, 230, 400, "Lapisan Pengguna", fill="#eaf3ff", stroke="#2b4d8f", fs=13, sw=2)
    sc.box("group", 290, 40, 420, 400, "Lapisan Aplikasi (Pelayan Web)", fill="#fef9e7", stroke="#8a6d1d", fs=13, sw=2)
    sc.box("group", 760, 40, 220, 400, "Lapisan Data", fill="#eafaf1", stroke="#1d7a46", fs=13, sw=2)
    sc.box("actor", 45, 90, 60, 100, "Pensyarah", fs=12)
    sc.box("actor", 150, 90, 60, 100, "Admin", fs=12)
    sc.box("round", 45, 330, 170, 70, "Pelayar web\n(HTML, CSS, JavaScript)", fill="#ffffff", stroke="#2b4d8f", fs=12)
    sc.line([(75, 205), (75, 330)], arrow=True, start="arrow", color="#2b4d8f", sw=1.6)
    sc.line([(180, 205), (180, 330)], arrow=True, start="arrow", color="#2b4d8f", sw=1.6)
    ys = [120, 200, 280, 360]
    names = ["Modul pengesahan dan akaun (PHP)", "Modul profil, rekod kriteria dan dokumen (PHP)",
             "Enjin semakan kriteria KP dan bar kemajuan (PHP)", "Modul ringkasan rekod dan kelengkapan (PHP)"]
    for y, t in zip(ys, names):
        sc.box("round", 320, y - 28, 360, 56, t, fill="#ffffff", stroke="#8a6d1d", fs=13)
        sc.line([(680, y), (735, y)], arrow=False, color="#555", sw=1.4)
    sc.line([(735, 120), (735, 360)], arrow=False, color="#555", sw=1.4)
    sc.box("rect", 790, 120, 160, 110, "Pangkalan data MySQL\n(10 jadual, phpMyAdmin)", fill="#ffffff", stroke="#1d7a46", fs=13)
    sc.box("rect", 790, 280, 160, 90, "Storan fail dokumen sokongan", fill="#ffffff", stroke="#1d7a46", fs=13)
    sc.line([(735, 175), (790, 175)], arrow=True, start="arrow", color="#555", sw=1.4)
    sc.line([(735, 325), (790, 325)], arrow=True, start="arrow", color="#555", sw=1.4)
    sc.line([(215, 365), (290, 365)], arrow=True, start="arrow", color="#111", sw=1.6, label="HTTP", lp=(252, 350), fs=11, bg=False)
    sc.text(500, 500, "Persekitaran pembangunan: XAMPP (Apache, PHP, MySQL) pada localhost", fs=13, italic=True)
    return sc


def org_tesis():
    sc = Scene(980, 470)
    bw, bh = 200, 96
    titles = [("BAB 1", "PENDAHULUAN"), ("BAB 2", "KAJIAN LITERATUR"), ("BAB 3", "METODOLOGI"), ("BAB 4", "ANALISIS SISTEM"),
              ("BAB 5", "REKA BENTUK SISTEM"), ("BAB 6", "IMPLEMENTASI DAN\nPENGUJIAN"), ("BAB 7", "KESIMPULAN")]
    pos = [(40, 60), (270, 60), (500, 60), (730, 60), (730, 330), (500, 330), (270, 330)]
    sc.text(380, 40, "PSM I", fs=14, bold=True)
    sc.text(380, 310, "PSM II", fs=14, bold=True)
    for i, ((a, b), (x, y)) in enumerate(zip(titles, pos)):
        col = "#dbeafe" if i < 4 else "#f1f5f9"
        sc.box("round", x, y, bw, bh, "", fill=col, stroke="#2b4d8f" if i < 4 else "#64748b", sw=1.8)
        sc.text(x + bw / 2, y + 36, a, fs=15, bold=True)
        sc.text(x + bw / 2, y + 60, b, fs=13)
    c = "#2b4d8f"
    for i in range(3):
        x, y = pos[i]
        sc.line([(x + bw, y + bh / 2), (pos[i + 1][0], y + bh / 2)], color=c, sw=2)
    sc.line([(pos[3][0] + bw / 2, pos[3][1] + bh), (pos[4][0] + bw / 2, pos[4][1])], color="#64748b", sw=2)
    sc.line([(pos[4][0], pos[4][1] + bh / 2), (pos[5][0] + bw, pos[5][1] + bh / 2)], color="#64748b", sw=2)
    sc.line([(pos[5][0], pos[5][1] + bh / 2), (pos[6][0] + bw, pos[6][1] + bh / 2)], color="#64748b", sw=2)
    return sc


# ------------------------------------------------------------------- output
def emit(folder, base, sc, title):
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, base + ".svg"), "w", encoding="utf-8") as f:
        f.write(sc.svg())
    with open(os.path.join(folder, base + ".drawio"), "w", encoding="utf-8") as f:
        f.write(sc.drawio(title))
    print("ok", base)


def main():
    b4 = sys.argv[1] if len(sys.argv) > 1 else os.path.join("Rajah", "Bab 4")
    b3 = sys.argv[2] if len(sys.argv) > 2 else os.path.join("Rajah", "Bab 3")
    emit(os.path.join("Rajah", "Bab 1"), "Rajah 1.1 Organisasi Tesis", org_tesis(), "Organisasi Tesis")
    s = erd(False)
    U = s.ents["users"]
    legend_er(s, 40, U["y"] + U["h"] + 50)
    emit(b4, "Rajah 4.10 ERD Kaki Gagak", s, "ERD")
    s = erd(True)
    U = s.ents["users"]
    legend_er(s, 40, U["y"] + U["h"] + 50)
    emit(b4, "Lampiran ERD Penuh", s, "ERD penuh")
    emit(b4, "Rajah 4.12 Carta Alir Pensyarah", flow_pensyarah(), "Carta Alir Pensyarah")
    emit(b4, "Rajah 4.13 Carta Alir Admin", flow_admin(), "Carta Alir Admin")
    emit(b3, "Rajah 3.1 Kitaran Agile TalentPro", agile(), "Kitaran Agile")
    emit(b3, "Rajah 3.2 Rajah Kes Guna", usecase(), "Rajah Kes Guna")
    emit(b3, "Rajah 3.3 Seni Bina Sistem", arch(), "Seni Bina")


if __name__ == "__main__":
    main()
