class FormController {

    initConfirm() {
        // Search every "data-confirm" form in current page and display a confirm message on submit.
        let elements = document.querySelectorAll("form[data-confirm]");
        elements.forEach(function (element) {
            let confirmData = element.getAttribute("data-confirm");
            element.addEventListener("submit", function(event) {
                event.preventDefault();
                let ret = window.confirm(`${confirmData}\n\nDo you confirm this action?`);
                if (ret) {
                    element.submit();
                }
            }, false);
        });
    }
}


export { FormController };
