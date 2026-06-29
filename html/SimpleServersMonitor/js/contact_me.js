$(function() {

    $("#contactForm input,#contactForm textarea").jqBootstrapValidation({
        preventSubmit: true,
        submitError: function($form, event, errors) {
        },
        submitSuccess: function($form, event) {
            $("#contactForm button[type=\"submit\"]").attr("disabled", true);
            event.preventDefault();

            var email = $("input#email").val();
            var message = $("textarea#message").val();
            $.ajax({
                url: "/api/contact",
                type: "POST",
                data: {
                    email: email,
                    message: message,
                    source: "SimpleServersMonitor"
                },
                cache: false,
                success: function() {
                    $("#contactForm button[type=\"submit\"]").attr("disabled", false);
                    $('#success').html("<div class='alert alert-success'>");
                    $('#success > .alert-success').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
                        .append("</button>");
                    $('#success > .alert-success')
                        .append("<strong>Your message has been sent.");
                    $('#success > .alert-success')
                        .append('</div>');

                    $('#contactForm').trigger("reset");
                },
                error: function() {
                    $('#success').html("<div class='alert alert-danger'>");
                    $('#success > .alert-danger').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
                        .append("</button>");
                    $('#success > .alert-danger').append("<strong>Sorry, it seems that my mail server is not responding. Please try again later!");
                    $('#success > .alert-danger').append('</div>');
                    $('#contactForm').trigger("reset");
                },
            })
        },
        filter: function() {
            return $(this).is(":visible");
        },
    });

    $("a[data-toggle=\"tab\"]").click(function(e) {
        e.preventDefault();
        $(this).tab("show");
    });
});

$('#contactForm input,#contactForm textarea').focus(function() {
    $('#success').html('');
});
