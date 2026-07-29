let today = new Date();
let [year, month, day] = [today.getFullYear(), today.getMonth()+1, today.getDate()];
document.getElementById('date').innerHTML = `${year}/${month}/${day}`;