var $ = function (name, styles, props, to = document.body) {
    return new O(name, styles, props, to).o;
};

class O
{
    constructor(name, s, p, to)
    {
        if (to)
        {
            this.o = document.createElement(name);
            if (p)
                this.add(this.o, p);
            if (s)
                this.add(this.o.style, s);
            to.appendChild(this.o);
        }
    }
    add(o, text)
    {
        let pp = text.split(";");
        if (pp.length === 0)
            return;
        for (let i = 0; i < pp.length; i++)
        {
            if (pp[i] === "")
                continue;
            var p = pp[i].split("=");
            if (p.length < 2)
                return;
            o[p[0].trim()] = p[1].trim();
        }
    }
}
