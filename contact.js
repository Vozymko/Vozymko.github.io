function validateForm(){
    let first = document.forms["contact"]["first_name"].value;
    if (first == "") {
      alert("First name must be filled out");
      return false;
    }
    let last = document.forms["contact"]["last_name"].value;
    if (last == "") {
      alert("Last name must be filled out");
      return false;
    }
    let email = document.forms["contact"]["email"].value;
    if (email == "") {
      alert("Email must be filled out");
      return false;
    }
    let message = document.forms["contact"]["message"].value;
    if (message == "") {
      alert("Message must be filled out");
      return false;
    }
    let phone = document.forms["contact"]["phone"].value;
    if (phone == "") {
      alert("Phone number must be filled out");
      return false;
    }
}