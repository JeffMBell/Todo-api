var person = {
  name: 'Jeff',
  age: 33
};

function updatePerson(obj) {
  obj.age = 34;
}

updatePerson(person);
console.log(person);