class FormController {

    setConfirmDelete() {
        // Search every "delete" form in current page and display a confirm message on submit.
        let elements = document.querySelectorAll("form[data-delete-confirm]");
        elements.forEach(function (element) {
            let deleteConfirmData = element.getAttribute("data-delete-confirm");
            element.addEventListener("submit", function(event) {
                event.preventDefault();
                let ret = window.confirm(`Delete ${deleteConfirmData}\n\nDo you confirm this action?`);
                if (ret) {
                    element.submit();
                }
            }, false);
        });
    }
}


export { FormController };
