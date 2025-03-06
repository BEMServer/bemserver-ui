
document.addEventListener("DOMContentLoaded", () => {

    let cardTransitionTime = 500;

    let cardElmts = [].slice.call(document.querySelectorAll(".card-flip"));
    let timeoutIds = {};

    for (let cardElmt of cardElmts) {
        timeoutIds[cardElmt] = null;

        cardElmt.addEventListener("click", () => {
            if (timeoutIds[cardElmt] != null) {
                window.clearTimeout(timeoutIds[cardElmt]);
                timeoutIds[cardElmt] = null;
            }

            if (!cardElmt.classList.contains("card-flip-is-ready")) {
                cardElmt.classList.add("card-flip-is-ready");
            }
            cardElmt.classList.toggle("card-flip-is-switched");

            timeoutIds[cardElmt] = window.setTimeout(() => {
                let cardSideElmts = [].slice.call(cardElmt.querySelectorAll(".card-flip-side"));
                for (let cardSideElmt of cardSideElmts) {
                    cardSideElmt.classList.toggle("card-flip-is-active");
                }

                timeoutIds[cardElmt] = null;
            }, cardTransitionTime / 2);
        });
    }
});
