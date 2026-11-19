#!/usr/bin/env python3
"""Penjana rajah Bab 4 (Gane dan Sarson): Rajah Konteks, DFD Aras 0/1, Carta Hierarki.

Satu model data -> SVG (untuk semakan/Word) + .drawio (boleh disunting).
Jalankan:  python tools/rajah_bab4.py  [folder_output]
"""
import math
import os
import random
import sys
from xml.sax.saxutils import escape

FONT = "Arial, Helvetica, sans-serif"
LBL = 11            # saiz huruf label aliran
CH = 5.9            # anggaran lebar aksara label (px)
SLOT = 16           # jarak minimum antara dua aliran pada satu sisi
CHAN = 14           # jarak antara saluran menegak


class N:
    def __init__(s, id, kind, name, x=0, y=0, w=0, h=0, num="", code=""):
        s.id, s.kind, s.name, s.x, s.y, s.w, s.h, s.num, s.code = id, kind, name, x, y, w, h, num, code

    @property
    def cy(s):
        return s.y + s.h / 2


class E:
    def __init__(s, src, dst, label, arrow=True):
        s.src, s.dst, s.label, s.arrow = src, dst, label, arrow
        s.pts, s.lpos, s.lanchor = [], None, "middle"


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


# ---------------------------------------------------------------- persilangan
def seg_cross(a, b):
    """Kira persilangan antara dua segmen ortogonal."""
    (x1, y1), (x2, y2) = a
    (x3, y3), (x4, y4) = b
    ah, bh = abs(y1 - y2) < 1e-6, abs(y3 - y4) < 1e-6
    if ah and bh:
        if abs(y1 - y3) < 1e-6 and min(max(x1, x2), max(x3, x4)) - max(min(x1, x2), min(x3, x4)) > 1:
            return 3
        return 0
    av, bv = abs(x1 - x2) < 1e-6, abs(x3 - x4) < 1e-6
    if av and bv:
        if abs(x1 - x3) < 1e-6 and min(max(y1, y2), max(y3, y4)) - max(min(y1, y2), min(y3, y4)) > 1:
            return 3
        return 0
    if ah and bv:
        h, v = a, b
    elif av and bh:
        h, v = b, a
    else:
        return 0
    (hx1, hy), (hx2, _) = h
    (vx, vy1), (_, vy2) = v
    if min(hx1, hx2) + 0.5 < vx < max(hx1, hx2) - 0.5 and min(vy1, vy2) + 0.5 < hy < max(vy1, vy2) - 0.5:
        return 1
    return 0


def crossings(edges):
    segs = []
    for i, e in enumerate(edges):
        for a, b in zip(e.pts, e.pts[1:]):
            segs.append((i, (a, b)))
    total = 0
    for i in range(len(segs)):
        for j in range(i + 1, len(segs)):
            if segs[i][0] != segs[j][0]:
                total += seg_cross(segs[i][1], segs[j][1])
    return total


# ------------------------------------------------------------------ susun atur
def layout(spec):
    nodes = {}
    for nid_, name in spec["left"]:
        kind = "ref" if isinstance(name, tuple) else "ent"
        if kind == "ref":
            nodes[nid_] = N(nid_, "ref", name[1], num=name[0], w=190)
        else:
            nodes[nid_] = N(nid_, "ent", name, w=160)
    for nid_, num, name in spec["procs"]:
        nodes[nid_] = N(nid_, "proc", name, num=num, w=250)
    for nid_, code, name in spec.get("stores", []):
        nodes[nid_] = N(nid_, "store", name, code=code, w=240)
    edges = [E(*f) for f in spec["flows"]]
    procs = [nodes[p[0]] for p in spec["procs"]]
    left = [nodes[l[0]] for l in spec["left"]]
    stores = [nodes[s[0]] for s in spec.get("stores", [])]
    order = {p.id: i for i, p in enumerate(procs)}

    def typ(e):
        a, b = nodes[e.src].kind, nodes[e.dst].kind
        k = {a, b}
        if k <= {"ent", "ref", "proc"} and "proc" in k and (a != "proc" or b != "proc"):
            return "L"
        if k == {"proc", "store"}:
            pid = e.src if nodes[e.src].kind == "proc" else e.dst
            return "Q" if pid in spec.get("right_procs", ()) else "R"
        if a == b == "proc":
            return "V"
        raise ValueError("aliran tidak disokong: %s -> %s" % (e.src, e.dst))

    for e in edges:
        e.t = typ(e)
        if e.t == "V" and abs(order[e.src] - order[e.dst]) != 1:
            raise ValueError("aliran proses-proses mesti bersebelahan: %s->%s" % (e.src, e.dst))

    nL = {p.id: 0 for p in procs}
    nR = {p.id: 0 for p in procs}
    for e in edges:
        if e.t == "L":
            nL[e.src if nodes[e.src].kind == "proc" else e.dst] += 1
        if e.t in ("R", "Q"):
            nR[e.src if nodes[e.src].kind == "proc" else e.dst] += 1
    for p in procs:
        lines = wrap(p.name, 24)
        p.lines = lines
        p.h = max(86, 40 + 16 * len(lines), SLOT * (max(nL[p.id], nR[p.id]) + 1))

    # kedudukan menegak proses
    y = 40
    for i, p in enumerate(procs):
        if i:
            adj = any(e.t == "V" and {e.src, e.dst} == {procs[i - 1].id, p.id} for e in edges)
            y += 70 if adj else 40
        p.y = y
        y += p.h

    # lebar saluran
    Lm = max([len(e.label) * CH + 14 for e in edges] + [100])
    elbL = max(1, sum(1 for e in edges if e.t == "L"))
    elbR = max(1, sum(1 for e in edges if e.t == "R"))
    nQ = sum(1 for e in edges if e.t == "Q")
    gap1 = Lm + 20 + CHAN * elbL + 40
    gap2 = Lm + 20 + CHAN * elbR + 40
    ex = 40
    px = ex + 190 + gap1 if any(n.kind == "ref" for n in left) else ex + 160 + gap1
    for p in procs:
        p.x = px
    sx = px + 250 + gap2
    for n in left:
        n.x = ex
    for s in stores:
        s.x = sx

    # kedudukan menegak stor (mengikut proses penulis/sisi kiri) dan entiti
    def place(col, skip_q):
        for n in col:
            cons, cl, cr = [], 0, 0
            for e in edges:
                if n.id in (e.src, e.dst):
                    if skip_q and e.t == "Q":
                        cr += 1
                        continue
                    other = e.dst if e.src == n.id else e.src
                    cons.append(nodes[other].cy)
                    cl += 1
            n.h = max(64, SLOT * (max(cl, cr) + 1))
            n.cy0 = sum(cons) / len(cons) if cons else 100
        col.sort(key=lambda n: n.cy0)
        cur = 30
        for n in col:
            n.y = max(cur, n.cy0 - n.h / 2)
            cur = n.y + n.h + 24

    place(stores, True)
    qprocs = [pp for pp in procs if any(e.t == "Q" and pp.id in (e.src, e.dst) for e in edges)]
    if qprocs and stores:
        bottom = max(st.y + st.h for st in stores)
        first = min(order[q.id] for q in qprocs)
        need = bottom + 60 - procs[first].y
        if need > 0:
            for pp in procs[first:]:
                pp.y += need
    place(left, False)

    # slot pada setiap sisi: kunci (id nod, sisi)
    def side_of(n, e):
        if n.kind == "proc":
            return "L" if e.t == "L" else "R"
        if n.kind == "store":
            return "r" if e.t == "Q" else "l"
        return "e"

    slot_groups = {}
    for e in edges:
        if e.t == "V":
            continue
        for nid_ in (e.src, e.dst):
            n_ = nodes[nid_]
            slot_groups.setdefault((nid_, side_of(n_, e)), []).append(e)

    ys = {}  # (id(e), node_id) -> y
    for (nid_, sd), lst in slot_groups.items():
        n_ = nodes[nid_]
        lst.sort(key=lambda e, nid_=nid_: (nodes[e.dst if e.src == nid_ else e.src].cy, e.label))
        for i, e in enumerate(lst):
            ys[(id(e), nid_)] = n_.y + (i + 1) * n_.h / (len(lst) + 1)

    # slot menegak (proses-proses)
    xs = {}
    for i in range(len(procs) - 1):
        a, b = procs[i], procs[i + 1]
        ve = [e for e in edges if e.t == "V" and {e.src, e.dst} == {a.id, b.id}]
        ve.sort(key=lambda e: e.label)
        for j, e in enumerate(ve):
            xs[id(e)] = a.x + (j + 1) * a.w / (len(ve) + 1)
            e.vidx, e.vn = j, len(ve)

    # bina garis: saluran menegak (kmap) + slot (ys) dioptimumkan dengan penyepuhlindapan simulasi
    def pts_for(e):
        procn = nodes[e.src] if nodes[e.src].kind == "proc" else nodes[e.dst]
        other = nodes[e.dst] if procn is nodes[e.src] else nodes[e.src]
        if e.t == "L":
            x_o, x_p = other.x + other.w, procn.x
        elif e.t == "Q":
            x_o, x_p = other.x + other.w, procn.x + procn.w
        else:
            x_o, x_p = other.x, procn.x + procn.w
        y_o, y_p = ys[(id(e), other.id)], ys[(id(e), procn.id)]
        k = kmap[id(e)]
        if e.t == "L":      # entiti di kiri, proses di kanan
            if abs(y_o - y_p) < 1.5:
                pts, lx = [(x_o, y_o), (x_p, y_o)], x_o + 14
            else:
                xc = x_o + Lm + 20 + k * CHAN
                pts, lx = [(x_o, y_o), (xc, y_o), (xc, y_p), (x_p, y_p)], x_o + 14
            ly = y_o
        elif e.t == "Q":    # proses pembaca -> sisi kanan stor (laluan mengelilingi)
            xr = x_o + 24 + k * CHAN
            pts, lx = [(x_p, y_p), (xr, y_p), (xr, y_o), (x_o, y_o)], x_p + 14
            ly = y_p
        else:               # proses di kiri, stor di kanan
            if abs(y_o - y_p) < 1.5:
                pts, lx = [(x_p, y_p), (x_o, y_p)], x_p + 14
            else:
                xc = x_p + Lm + 20 + k * CHAN
                pts, lx = [(x_p, y_p), (xc, y_p), (xc, y_o), (x_o, y_o)], x_p + 14
            ly = y_p
        forward = (e.t == "L" and nodes[e.src] is other) or (e.t in ("R", "Q") and nodes[e.src] is procn)
        if not forward:
            pts = pts[::-1]
        return pts, (lx, ly)

    groups = {g_: [e for e in edges if e.t == g_] for g_ in ("L", "R", "Q")}
    kmap = {}
    for g, lst in groups.items():
        for i, e in enumerate(lst):
            kmap[id(e)] = i

    def build(e):
        if e.t in ("L", "R", "Q"):
            e.pts, e.lpos = pts_for(e)
            e.lanchor = "start"
        else:
            a_, b_ = nodes[e.src], nodes[e.dst]
            x = xs[id(e)]
            if order[e.src] < order[e.dst]:
                e.pts = [(x, a_.y + a_.h), (x, b_.y)]
                my = (a_.y + a_.h + b_.y) / 2
            else:
                e.pts = [(x, a_.y), (x, b_.y + b_.h)]
                my = (b_.y + b_.h + a_.y) / 2
            left_side = e.vn > 1 and e.vidx < e.vn / 2
            e.lpos = (x + (-8 if left_side else 8), my)
            e.lanchor = "end" if left_side else "start"

    for e in edges:
        build(e)

    def segs_of(e):
        return list(zip(e.pts, e.pts[1:]))

    def cost_of(e):
        mine = segs_of(e)
        tot = 0
        for f in edges:
            if f is e:
                continue
            for sa in mine:
                for sb in segs_of(f):
                    tot += seg_cross(sa, sb)
        return tot

    rnd = random.Random(11)
    multi = [k_ for k_, v_ in slot_groups.items() if len(v_) > 1]
    mov = [e for e in edges if e.t in ("L", "R", "Q")]
    gkeys = [g_ for g_ in groups if len(groups[g_]) > 1]
    iters = 600 * max(1, len(mov))
    T0 = 2.0
    for it in range(iters):
        T = T0 * (1 - it / iters) + 0.05
        if rnd.random() < 0.5:
            if not gkeys:
                continue
            g = rnd.choice(gkeys)
            lst = groups[g]
            x_, y_ = rnd.sample(lst, 2)
            before = cost_of(x_) + cost_of(y_)
            kmap[id(x_)], kmap[id(y_)] = kmap[id(y_)], kmap[id(x_)]
            build(x_)
            build(y_)
            d = cost_of(x_) + cost_of(y_) - before
            if d > 0 and rnd.random() >= math.exp(-d / T):
                kmap[id(x_)], kmap[id(y_)] = kmap[id(y_)], kmap[id(x_)]
                build(x_)
                build(y_)
        else:
            key = rnd.choice(multi)
            lst = slot_groups[key]
            x_, y_ = rnd.sample(lst, 2)
            before = cost_of(x_) + cost_of(y_)
            ys[(id(x_), key[0])], ys[(id(y_), key[0])] = ys[(id(y_), key[0])], ys[(id(x_), key[0])]
            build(x_)
            build(y_)
            d = cost_of(x_) + cost_of(y_) - before
            if d > 0 and rnd.random() >= math.exp(-d / T):
                ys[(id(x_), key[0])], ys[(id(y_), key[0])] = ys[(id(y_), key[0])], ys[(id(x_), key[0])]
                build(x_)
                build(y_)

    allx = [n.x + n.w for n in nodes.values()] + [p[0] for e in edges for p in e.pts]
    ally = [n.y + n.h for n in nodes.values()] + [p[1] for e in edges for p in e.pts]
    W, H = max(allx) + 40, max(ally) + 40
    return dict(nodes=list(nodes.values()), edges=edges, W=W, H=H)


# --------------------------------------------------------------------- lukisan
def svg_header(W, H):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" font-family="%s">'
        '<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
        '<path d="M0,0 L10,5 L0,10 z" fill="#111"/></marker></defs>'
        '<rect width="100%%" height="100%%" fill="#fff"/>' % (W, H, W, H, FONT)
    )


def svg_node(n):
    o = []
    if n.kind == "proc":
        o.append('<rect x="%g" y="%g" width="%g" height="%g" rx="16" fill="#fff" stroke="#111" stroke-width="1.6"/>' % (n.x, n.y, n.w, n.h))
        o.append('<text x="%g" y="%g" text-anchor="middle" font-size="13">%s</text>' % (n.x + n.w / 2, n.y + 20, escape(n.num)))
        o.append('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="#111" stroke-width="1"/>' % (n.x + 8, n.y + 28, n.x + n.w - 8, n.y + 28))
        lines = n.lines
        top = n.y + 28 + (n.h - 28 - 16 * len(lines)) / 2 + 12
        for i, t in enumerate(lines):
            o.append('<text x="%g" y="%g" text-anchor="middle" font-size="13">%s</text>' % (n.x + n.w / 2, top + 16 * i, escape(t)))
    elif n.kind == "store":
        o.append('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="#111" stroke-width="1.6"/>' % (n.x, n.y, n.x + n.w, n.y))
        o.append('<line x1="%g" y1="%g" x2="%g" y2="%g" stroke="#111" stroke-width="1.6"/>' % (n.x, n.y + n.h, n.x + n.w, n.y + n.h))
        o.append('<rect x="%g" y="%g" width="46" height="%g" fill="#fff" stroke="#111" stroke-width="1.6"/>' % (n.x, n.y, n.h))
        o.append('<text x="%g" y="%g" text-anchor="middle" font-size="13">%s</text>' % (n.x + 23, n.cy + 5, escape(n.code)))
        o.append('<text x="%g" y="%g" text-anchor="middle" font-size="13">%s</text>' % (n.x + 46 + (n.w - 46) / 2, n.cy + 5, escape(n.name)))
    elif n.kind in ("ent", "box"):
        o.append('<rect x="%g" y="%g" width="%g" height="%g" fill="#fff" stroke="#111" stroke-width="1.6"/>' % (n.x, n.y, n.w, n.h))
        lines = wrap(n.name, max(8, int(n.w / 8.2))) if n.kind == "box" else [n.name]
        top = n.cy - 8 * (len(lines) - 1) + 5
        for i, t in enumerate(lines):
            bold = ' font-weight="bold"' if n.kind == "box" and getattr(n, "bold", False) else ""
            o.append('<text x="%g" y="%g" text-anchor="middle" font-size="14"%s>%s</text>' % (n.x + n.w / 2, top + 16 * i, bold, escape(t)))
    elif n.kind == "ref":
        o.append('<rect x="%g" y="%g" width="%g" height="%g" fill="#f2f2f2" stroke="#111" stroke-width="1.6" stroke-dasharray="6 3"/>' % (n.x, n.y, n.w, n.h))
        o.append('<text x="%g" y="%g" text-anchor="middle" font-size="13">%s</text>' % (n.x + n.w / 2, n.cy - 4, escape(n.num)))
        for i, t in enumerate(wrap(n.name, 22)):
            o.append('<text x="%g" y="%g" text-anchor="middle" font-size="13">%s</text>' % (n.x + n.w / 2, n.cy + 12 + 15 * i, escape(t)))
    return "\n".join(o)


def svg_edge(e):
    d = "M" + " L".join("%g,%g" % p for p in e.pts)
    o = ['<path d="%s" fill="none" stroke="#111" stroke-width="1.3"%s/>' % (d, ' marker-end="url(#a)"' if e.arrow else "")]
    if e.label:
        w = len(e.label) * CH + 8
        x, y = e.lpos
        if e.lanchor == "middle":
            rx = x - w / 2
        elif e.lanchor == "end":
            rx = x - w
        else:
            rx = x
        o.append('<rect x="%g" y="%g" width="%g" height="15" fill="#fff"/>' % (rx, y - 8, w))
        o.append('<text x="%g" y="%g" text-anchor="%s" font-size="%d" dx="%g">%s</text>' % (
            x, y + 4, e.lanchor, LBL, 0, escape(e.label)))
    return "\n".join(o)


def to_svg(m):
    out = [svg_header(m["W"], m["H"])]
    out += [svg_edge(e) for e in m["edges"]]
    out += [svg_node(n) for n in m["nodes"]]
    out.append("</svg>")
    return "\n".join(out)


def to_drawio(m, name):
    cells, i = [], 2

    def nid():
        nonlocal i
        i += 1
        return "c%d" % i

    for n in m["nodes"]:
        g = '<mxGeometry x="%g" y="%g" width="%g" height="%g" as="geometry"/>' % (n.x, n.y, n.w, n.h)
        if n.kind == "proc":
            val = escape("%s<hr>%s" % (n.num, n.name))
            cells.append('<mxCell id="%s" value="%s" style="rounded=1;arcSize=12;whiteSpace=wrap;html=1;fontSize=13;strokeWidth=2;" vertex="1" parent="1">%s</mxCell>' % (nid(), val, g))
        elif n.kind == "store":
            cells.append('<mxCell id="%s" value="%s" style="whiteSpace=wrap;html=1;fontSize=13;strokeWidth=2;" vertex="1" parent="1"><mxGeometry x="%g" y="%g" width="46" height="%g" as="geometry"/></mxCell>' % (nid(), escape(n.code), n.x, n.y, n.h))
            cells.append('<mxCell id="%s" value="%s" style="shape=partialRectangle;right=0;whiteSpace=wrap;html=1;fontSize=13;strokeWidth=2;" vertex="1" parent="1"><mxGeometry x="%g" y="%g" width="%g" height="%g" as="geometry"/></mxCell>' % (nid(), escape(n.name), n.x + 46, n.y, n.w - 46, n.h))
        elif n.kind == "ref":
            val = escape("%s<br>%s" % (n.num, n.name))
            cells.append('<mxCell id="%s" value="%s" style="whiteSpace=wrap;html=1;fontSize=13;strokeWidth=2;dashed=1;fillColor=#f2f2f2;" vertex="1" parent="1">%s</mxCell>' % (nid(), val, g))
        else:
            bold = "fontStyle=1;" if getattr(n, "bold", False) else ""
            cells.append('<mxCell id="%s" value="%s" style="whiteSpace=wrap;html=1;fontSize=14;strokeWidth=2;%s" vertex="1" parent="1">%s</mxCell>' % (nid(), escape(n.name), bold, g))
    for e in m["edges"]:
        a, b = e.pts[0], e.pts[-1]
        mid = "".join('<mxPoint x="%g" y="%g"/>' % p for p in e.pts[1:-1])
        arr = "endArrow=classic;" if e.arrow else "endArrow=none;"
        cells.append(
            '<mxCell id="%s" value="%s" style="%shtml=1;rounded=0;strokeWidth=1.5;fontSize=11;labelBackgroundColor=#ffffff;" edge="1" parent="1">'
            '<mxGeometry relative="1" as="geometry"><mxPoint x="%g" y="%g" as="sourcePoint"/><mxPoint x="%g" y="%g" as="targetPoint"/>'
            '<Array as="points">%s</Array></mxGeometry></mxCell>' % (nid(), escape(e.label), arr, a[0], a[1], b[0], b[1], mid))
    return (
        '<mxfile host="app.diagrams.net"><diagram name="%s"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" page="1" '
        'pageScale="1" pageWidth="%d" pageHeight="%d" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>%s</root></mxGraphModel></diagram></mxfile>'
        % (escape(name), m["W"], m["H"], "".join(cells))
    )


# ------------------------------------------------------------------ rajah konteks
def context(spec):
    nodes, edges = [], []
    ents = spec["entities"]  # [(id, nama, x, [(arah, label)...])]
    sysn = N("s", "proc", spec["name"], num="0", w=300)
    nodes.append(sysn)
    maxn = max(len(e[3]) for e in ents)
    Lm = max(len(l) for e in ents for _, l in e[3]) * CH + 20
    gap = Lm + 70
    ent_l, ent_r = ents[0], ents[1]
    ex_l, ex_r = 40, 40 + 170 + gap + 300 + gap
    sysn.x = 40 + 170 + gap
    H = max(len(ent_l[3]), len(ent_r[3])) * 34 + 50
    sysn.y, sysn.h = 40, H
    sysn.lines = wrap(spec["name"], 26)
    for (id, nama, side, flows) in ents:
        h = len(flows) * 34 + 50
        en = N(id, "ent", nama, x=ex_l if side == "L" else ex_r, y=40 + (H - h) / 2 if h < H else 40, w=170, h=min(h, H))
        en.h = h if h <= H else H
        en.y = 40 + (H - en.h) / 2
        nodes.append(en)
        for k, (arah, label) in enumerate(flows):
            y = en.y + (k + 1) * en.h / (len(flows) + 1)
            xe = en.x + en.w if side == "L" else en.x
            xs_ = sysn.x if side == "L" else sysn.x + sysn.w
            if arah == "in":   # entiti -> sistem
                e = E(id, "s", label)
                e.pts = [(xe, y), (xs_, y)]
            else:
                e = E("s", id, label)
                e.pts = [(xs_, y), (xe, y)]
            e.lpos = ((xe + xs_) / 2, y)
            edges.append(e)
    W = ex_r + 170 + 40
    return dict(nodes=nodes, edges=edges, W=W, H=H + 80)


# ---------------------------------------------------------------- carta hierarki
def hierarchy(spec):
    nodes, edges = [], []
    bw, bh, gx = 250, 46, 90
    groups = spec["groups"]
    total = len(groups) * bw + (len(groups) - 1) * gx
    root = N("r", "box", spec["root"], x=40 + total / 2 - bw / 2 - 20, y=30, w=bw + 40, h=bh + 10)
    root.bold = True
    nodes.append(root)
    gy = 30 + bh + 10 + 60
    maxkids = 0
    for gi, (gname, kids) in enumerate(groups):
        x = 40 + gi * (bw + gx)
        g = N("g%d" % gi, "box", gname, x=x, y=gy, w=bw, h=bh)
        g.bold = True
        nodes.append(g)
        e = E("r", g.id, "", arrow=False)
        rx, ry = root.x + root.w / 2, root.y + root.h
        midy = (ry + gy) / 2
        e.pts = [(rx, ry), (rx, midy), (x + bw / 2, midy), (x + bw / 2, gy)]
        edges.append(e)
        maxkids = max(maxkids, len(kids))
        spine_x = x + 24
        for ki, kname in enumerate(kids):
            ky = gy + bh + 26 + ki * (bh + 18)
            kn = N("k%d_%d" % (gi, ki), "box", kname, x=x + 50, y=ky, w=bw - 50, h=bh)
            nodes.append(kn)
            e = E(g.id, kn.id, "", arrow=False)
            e.pts = [(spine_x, gy + bh if ki == 0 else ky - 18 - bh / 2 - 0), (spine_x, ky + bh / 2), (x + 50, ky + bh / 2)]
            if ki == 0:
                e.pts = [(spine_x, gy + bh), (spine_x, ky + bh / 2), (x + 50, ky + bh / 2)]
            else:
                prev_c = gy + bh + 26 + (ki - 1) * (bh + 18) + bh / 2
                e.pts = [(spine_x, prev_c), (spine_x, ky + bh / 2), (x + 50, ky + bh / 2)]
            edges.append(e)
    W = 40 + total + 40
    H = gy + bh + 26 + maxkids * (bh + 18) + 20
    return dict(nodes=nodes, edges=edges, W=W, H=H)


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rajah_spec import CONTEXT, LEVEL0, LEVEL1, HIERARCHY  # noqa: E402


def emit(folder, base, m, title):
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, base + ".svg"), "w", encoding="utf-8") as f:
        f.write(to_svg(m))
    with open(os.path.join(folder, base + ".drawio"), "w", encoding="utf-8") as f:
        f.write(to_drawio(m, title))
    print("ok", base, "silang=", crossings([e for e in m["edges"] if len(e.pts) > 1]))


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else os.path.join("Rajah", "Bab 4")
    emit(folder, "Rajah 4.1 Rajah Konteks", context(CONTEXT), "Rajah Konteks")
    emit(folder, "Rajah 4.2 DFD Aras 0", layout(LEVEL0), "DFD Aras 0")
    names = {"1.0": "Urus Akaun dan Pengesahan", "2.0": "Semak Kelengkapan Rekod", "3.0": "Urus Profil dan Perkhidmatan",
             "4.0": "Urus Rekod Kriteria KP", "5.0": "Urus LPPT dan Tatatertib", "6.0": "Semak Kriteria KP", "7.0": "Papar Kemajuan dan Ringkasan"}
    for n, (k, spec) in enumerate(LEVEL1.items()):
        emit(folder, "Rajah 4.%d DFD Aras 1 Proses %s" % (3 + n, k), layout(spec), "DFD Aras 1 Proses " + k)
    emit(folder, "Rajah 4.11 Carta Hierarki", hierarchy(HIERARCHY), "Carta Hierarki")


if __name__ == "__main__":
    main()
