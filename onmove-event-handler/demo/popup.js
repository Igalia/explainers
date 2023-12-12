var y = null;
var x = null;

const dWidth = window.outerWidth - 100;

window.addEventListener("message", (e) => {
    if (e.data.close) {
        window.close();
        return;
    }

    if (!(e.data?.top))
        return;

    y = e.data.top;
    x = e.data.left;

    // window isn't actually 100px so adjust accordingly
    x = x - dWidth;

    window.moveTo(x, y);
});




