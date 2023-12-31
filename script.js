let decimals = 2;
let variables = {pi: Math.PI, e: Math.E};
let assignedVariableNames = [];
let reservedKeys = ["pi", "e", "sin", "cos", "tan", "sqrt", "log", "abs", "round", "random", "cbrt", "max", "min"];
let dragElement = null;
let lastKey = null;

document.addEventListener('DOMContentLoaded', (event) => {
  bind_events();
  if (useCookies() && !getCookie("firsttime")) {
    tutorial()
  } else {
    loadState();
    if (document.querySelectorAll('input.expression').length === 0) {
      addTextInput(50, 70);
    }
  }
});

function tutorial() {
  setCookie("firsttime", "true", 365 * 10); // Set cookie for 10 years
  fetch('https://padcalc.com/padcalc.json')
    .then(response => response.json())
    .then(data => importStateData(data))
    .then(loadState)
    .then(focusOnFirstOperation);
}

function focusOnFirstOperation() {
  let input = document.querySelectorAll('input.expression.comment')[1];
  input.classList.remove('comment');
  input.style.width = '160px';
  input.focus();
}

function addTextInput(x, y) {
  const input = document.createElement('input');
  add_listeners_to_input(input);
  input.style.position = 'absolute';
  input.style.left = x + 'px';
  input.style.top = y + 'px';
  input.classList.add('expression');
  input.draggable = "true";
  document.body.appendChild(input);
  input.focus();
}

function process_cmd(input) {
  const value = input.value;

  let result;
  if (value.endsWith('=')) {
    if (/^@\s?[a-zA-Z]+[a-zA-Z0-9_]*/.test(value)) {
      applyTemplate(input);
      return;
    } else {
      result = calculate(value);
      if (result != undefined) result = `${value}${result}`;
    }
  } else {
    result = recalculation(value);
  }
  if (result != undefined) {
    input.value = `${result}`;
    applyStyle(input);
    saveState();
  }
}

function pad_assignment(variableValue, variableName) {
  if (variableName in variables &&
      !(assignedVariableNames.includes(variableName))
    ) {
    alert('Error: This variable name is already in use.');
    return;
  }

  if (reservedKeys.includes(variableName)) {
    alert('Error: This variable name belongs to an existing function.');
    return;
  }

  if (get_variable(variableName) != variableValue) {
    set_variable(variableName, variableValue);

    displayVariables();
    recalculate_variable(variableName);
    saveState();
  }
}

function recalculation(operations_chain) {
  const parts = operations_chain.split('=');
  for(let i = 0; i < parts.length; i++) {
    let left = parts[i]
    const assignmentMatch = left.match(/=?(\[?-?\d+\.?\d*(,.*\])?)\s*->([a-zA-Z]+[a-zA-Z0-9_]*)$/);
    if (assignmentMatch) {
      pad_assignment(assignmentMatch[1], assignmentMatch[3].trim());
      break;
    }
    let result = calculate(`${left}=`, false)
    let right_operation = parts[i+1]
    if (right_operation == undefined || right_operation === "") {
      break
    }
    let rest = right_operation.match(/(\[?\d+\.?\d*(,.*\])?)(.*)/)[3]
    parts[i+1] = `${result}${rest}`
  }
  return parts.join('=')
}

function calculate(value, noisy = true) {
  const parts = value.split('=');
  if (parts.length >= 2) {
    let expression = parts[parts.length - 2];

    if (parts[parts.length - 1].trim() != '') {
      return;
    }

    let results = [];
    if (/±/.test(expression)) {
      let r1 = evaluate(expression.replace(/±/g, "+"));
      let r2 = evaluate(expression.replace(/±/g, "-"));
      if (r1 === undefined || r2 === undefined) {
        if (noisy) alert('Error: Invalid expression.');
        return;
      }
      results.push(r1);
      results.push(r2);
    } else {
      let r1 = evaluate(expression);
      if (r1 === undefined) {
        if (noisy) alert('Error: Invalid expression.');
        return;
      }
      results.push(r1);
    }

    return castResults(results);
  }
}

function castResults(results) {
  // Apply conversions to each result
  let processedResults = results.map(result => {
    if (Number.isFinite(result)) {
      if (Math.floor(result) === result) {
        return parseInt(result, 10);
      } else {
        return result.toFixed(decimals);
      }
    }
    return result;
  });

  // If there's more than one result, return them as a string
  if (processedResults.length > 1) {
    return `[${processedResults.join(',')}]`;
  }

  // If there's only one result, return it
  return processedResults[0];
}

function displayVariables() {
  const variablesContainer = document.getElementById('variablesContainer');
  variablesContainer.innerHTML = ''; // Clear the container

  const variableNames = Object.keys(variables).sort();

  for (const variableName of variableNames) {
    const variableValue = get_variable(variableName);

    const variableElement = document.createElement('p');
    let value = eval(variableValue);

    // if value is an array, apply the conversion to each element
    if (Array.isArray(value)) {
      value = value.map(element => {
        if (Math.floor(element) === element) {
          return parseInt(element, 10);
        } else {
          return element.toFixed(decimals);
        }
      });
      value = `[${value.join(',')}]`;
    } else {
      if (Math.floor(value) === value) {
        value = parseInt(value, 10);
      } else {
        value = eval(value).toFixed(decimals);
      }
    }
    variableElement.textContent = `${variableName}: ${value}`;
    if (assignedVariableNames.includes(variableName)) {
      variableElement.style.fontStyle = 'italic';
    }
    variablesContainer.appendChild(variableElement);
  }

  document.getElementById("decimals").value = decimals;
}

function addVariable() {
  const newVariableInput = document.getElementById('newVariableInput');
  const variableMatch = newVariableInput.value.match(/([a-zA-Z]+[a-zA-Z0-9_]*)\s*[=|:]\s*(-?\d+\.?\d*)$/);

  if (variableMatch) {
    const variableName = variableMatch[1];
    const variableValue = Number(variableMatch[2]);

    if (assignedVariableNames.includes(variableName)) {
      alert('Error: This variable name is used in the operations.');
      return;
    }
    if (reservedKeys.includes(variableName)) {
      alert('Error: This variable name belongs to an existing function.');
      return;
    }

    set_variable(variableName, variableValue, false);

    displayVariables();
    recalculate_variable(variableName);
    saveState();
  } else {
    alert('Invalid variable format. Please use the format "v: 12".');
  }

  newVariableInput.value = '';
}

function set_variable(variableName, variableValue, protected = true) {
  variableName = variableName.trim();
  variables[variableName] = variableValue;
  if (protected && !assignedVariableNames.includes(variableName)) {
    assignedVariableNames.push(variableName);
  }
}

function get_variable(variableName) {
  return variables[variableName.trim()];
}

function saveState() {
  const inputs = Array.from(document.querySelectorAll('input.expression')).map(input => ({
    value: input.value,
    top: input.style.top,
    left: input.style.left
  }));

  localStorage.setItem('inputs', JSON.stringify(inputs));
  localStorage.setItem('variables', JSON.stringify(variables));
  localStorage.setItem('assignedVariableNames', JSON.stringify(assignedVariableNames));
  localStorage.setItem('decimals', JSON.stringify(decimals));
}

function exportState() {
  const stateData = {
    inputs: Array.from(document.querySelectorAll('input.expression')).map(input => ({
      value: input.value,
      top: input.style.top,
      left: input.style.left
    })),
    variables: variables,
    assignedVariableNames: assignedVariableNames,
    decimals: decimals
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateData));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "padcalc.json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function loadState() {
  const inputs = JSON.parse(localStorage.getItem('inputs')) || [];

  inputs.forEach(inputData => {
    const input = document.createElement('input');
    add_listeners_to_input(input);
    input.value = inputData.value;
    input.style.position = 'absolute'; // Position the input absolutely
    input.style.top = inputData.top;
    input.style.left = inputData.left;
    input.classList.add('expression');
    input.draggable = "true";
    applyStyle(input);

    document.body.appendChild(input);
  });

  Object.assign(variables, JSON.parse(localStorage.getItem('variables')) || {});
  Object.assign(assignedVariableNames, JSON.parse(localStorage.getItem('assignedVariableNames')) || []);
  decimals = JSON.parse(localStorage.getItem('decimals')) || 2;

  displayVariables();
}

function importFile() {
  // Create a new input element
  let input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json'; // Only accept .json files

  // Listen for changes to the input field
  input.onchange = function (event) {
    // Get the selected file
    let file = event.target.files[0];
    if (file) {
      // Call the importState function with the selected file
      importState(file);
    }
  };

  // Trigger the file dialog
  input.click();
}

function importState(file) {
  const reader = new FileReader();
  reader.onload = function(event) {
    const stateData = JSON.parse(event.target.result);
    importStateData(stateData);
    location.reload();
  };
  reader.readAsText(file);
}

function importStateData(stateData) {
  localStorage.setItem('inputs', JSON.stringify(stateData.inputs));
  localStorage.setItem('variables', JSON.stringify(stateData.variables));
  localStorage.setItem('assignedVariableNames', JSON.stringify(stateData.assignedVariableNames));
  localStorage.setItem('decimals', JSON.stringify(stateData.decimals));
  variables = {
    ...variables,
    pi: Math.PI,
    e: Math.E
  };
}

function add_listeners_to_input(input) {
  input.addEventListener('keydown', function (event) {
    lastKey = event.key;
    if (lastKey === 'Enter' || lastKey === 'Tab') {
      event.preventDefault();
      return;
    }
  });

  input.addEventListener('keyup', function (event) {
    if (lastKey === '=' || lastKey === 'Enter'  ||
        event.key === '=' || event.key === 'Enter') {
      process_cmd(input);
      applyStyle(input);
    } else if (lastKey === 'Tab' || event.key === 'Tab') {
      process_cmd(input);
      applyStyle(input);
      addTextInput(input.offsetLeft, input.offsetTop + 35);
    }
    adjustWidth(input);
    lastKey = null;
  });

  input.addEventListener('focusout', function (event) {
    if (input.value.trim() === '') {
      document.body.removeChild(input);
      return;
    }
    if (/->[a-zA-Z]+[a-zA-Z0-9_]*$/.test(input.value)) {
      process_cmd(input);
      applyStyle(input);
      adjustWidth(input);
    }
  });

  input.addEventListener('input', function (event) {
    if (input.value.endsWith('=')) {
      process_cmd(input);
      applyStyle(input);
      adjustWidth(input);
    }
  });
  input.addEventListener('dragstart', dragStart);
  input.addEventListener('dragend', dragEnd);
}

function adjustWidth(input) {
  const preWidth = input.offsetWidth;
  let newWidth;
  if (input.classList.contains('comment')) {
    newWidth = ((input.value.length + 1) * 12);
  } else {
    newWidth = ((input.value.length + 1) * 16);
  }
  if (preWidth < newWidth) {
    input.style.width = newWidth + 'px';
  }
}

function applyStyle(input) {
  if (/=\[?-?\d/.test(input.value) ||
      /=[NaN|Infinity]/.test(input.value) ||
      /->[a-zA-Z]/.test(input.value)
    ) {
    input.classList.remove('comment');
  } else {
    input.classList.add('comment');
  }
  adjustWidth(input);
}

function reset() {
  if (confirm('Are you sure you want to reset?\nAll the calculations and variables will be lost.')) {
    localStorage.removeItem('inputs');
    localStorage.removeItem('variables');
    localStorage.removeItem('decimals');
    localStorage.removeItem('assignedVariableNames');
    location.reload();
  }
}

function bind_events() {
  const canvas = document.getElementById('myCanvas');
  canvas.addEventListener('mouseup', function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    addTextInput(x, y);
  });
  document.getElementById('newVariableInput').addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
      addVariable();
    }
  });
}

function selectInputsWithVariable(variable) {
  // Selecciona todos los elementos de entrada
  let inputs = document.querySelectorAll('input.expression');

  let regex = new RegExp(`^${variable}$`, 'i'); // 'i' es para ignorar mayúsculas y minúsculas

  // Filtra los elementos de entrada por variable exacto
  let inputsWithVariable = Array.from(inputs).filter(input => {
    // Extrae todas las palabras del variable del input
    let words = input.value.match(/[a-z]+[a-z0-9_]*/gi);

    // Si hay words, itera sobre ellas y prueba la coincidencia
    if (words) {
      for (let i = 0; i < words.length; i++) {
        if (regex.test(words[i]) && regex.test(`->${variable}`) === false) {
          return true;
        }
      }
    }

    return false;
  });

  return inputsWithVariable;
}

function selectInputsWithDecimals() {
  let inputs = document.querySelectorAll('input.expression');
  let inputsWithDecimals = Array.from(inputs).filter(input => input.value.includes("."));
  return inputsWithDecimals;
}

function recalculate_variable(variable) {
  let inputs;
  if (variable === ".") {
    inputs = selectInputsWithDecimals();
  } else {
    inputs = selectInputsWithVariable(variable);
  }
  for (let i = 0; i < inputs.length; i++) {
    let input = inputs[i];
    if (input.value.includes("=")) {
      let result = recalculation(input.value);
      if (result) {
        input.value = result;
        applyStyle(input);
        saveState();
      }
    }
  }
}

function setDecimals() {
  const new_decimals = document.getElementById("decimals").value
  if (parseInt(new_decimals)!=NaN) {
    decimals = parseInt(new_decimals)
    recalculate_variable(".")
    displayVariables();
    saveState();
  }
  return false;
}

function dragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function drop(event) {
  event.preventDefault();
  const x = event.clientX - dragElement.offsetWidth / 2;
  const y = event.clientY;
  dragElement.style.left = x + 'px';
  dragElement.style.top = y + 'px';

  event.dataTransfer.clearData();
}

function dragStart(event) {
  dragElement = event.target;
  event.dataTransfer.setData('text/plain', event.target.id);
  event.dataTransfer.dropEffect = "move";
}

function dragEnd(event) {
  event.preventDefault();
  const x = event.clientX - dragElement.offsetWidth / 2;
  const y = event.clientY;
  dragElement.style.left = x + 'px';
  dragElement.style.top = y + 'px';
  saveState();

  dragElement = null;
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function useCookies() {
  setCookie("test", "test");
  return uses = getCookie("test") == "test"
}

function setCookie(cname, cvalue, exdays) {
  let d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  let expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function evaluate(expression) {
  while (true) {
    const initial_expression = expression;
    expression = applyReplacements(expression);
    if (expression === initial_expression) {
      break;
    }
  }
  try {
    return eval(expression);
  } catch (e) {
    return;
  }
}

function applyReplacements(expression) {
  expression = expression.replace(/[a-zA-Z]+[a-zA-Z0-9_]*/g, function (match) {
    if (match in variables) {
      return get_variable(match);
    } else {
      return match;
    }
  });

  expression = expression.toLowerCase();

  try {
    expression = expression.replace(/sin\(([^)]*)\)/g, function (match) {
      let expression = match.match(/^sin\(([^)]*)\)/)[1];
      let result = eval(expression);
      return Math.sin(result);
    });
  } catch (e) { }

  try {
    expression = expression.replace(/cos\(([^)]*)\)/g, function (match) {
      let expression = match.match(/^cos\(([^)]*)\)/)[1];
      let result = eval(expression);
      return Math.cos(result);
    });
  } catch (e) { }

  try {
  expression = expression.replace(/tan\(([^)]*)\)/g, function (match) {
    let expression = match.match(/^tan\(([^)]*)\)/)[1];
    let result = eval(expression);
    return Math.tan(result);
  });
  } catch (e) { }

  try {
    expression = expression.replace(/sqrt\(([^)]*)\)/g, function (match) {
      let expression = match.match(/sqrt\(([^)]*)\)/)[1];
      let result = eval(expression);
      return Math.sqrt(result);
    });
  } catch (e) { }

  try {
    expression = expression.replace(/log\(([^)]*)\)/g, function (match) {
      let expression = match.match(/^log\(([^)]*)\)/)[1];
      let result = eval(expression);
      return Math.log(result);
    });
  } catch (e) { }

  try {
    expression = expression.replace(/abs\(([^)]*)\)/g, function (match) {
      let expression = match.match(/^abs\(([^)]*)\)/)[1];
      let result = eval(expression);
      return Math.abs(result);
    });
  } catch (e) { }

  try {
    expression = expression.replace(/round\(([^)]*)\)/g, function (match) {
      let expression = match.match(/^round\(([^)]*)\)/)[1];
      let result = eval(expression);
      return Math.round(result);
    });
  } catch (e) { }

  try {
    expression = expression.replace(/random\(\)/g, function (match) {
      return Math.random();
    });
  } catch (e) { }

  try {
    expression = expression.replace(/cbrt\(([^)]*)\)/g, function (match) {
      let expression = match.match(/^cbrt\(([^)]*)\)/)[1];
      let result = eval(expression);
      return Math.cbrt(result);
    });
  } catch (e) { }

  try {
    expression = expression.replace(/deg\(([^)]*)\)/g, function (match) {
      let expression = match.match(/^deg\(([^)]*)\)/)[1];
      let radians = eval(expression);
      return radians * 180 / Math.PI;
    });
  } catch (e) { }

  try {
    expression = expression.replace(/rad\(([^)]*)\)/g, function (match) {
      let expression = match.match(/^rad\(([^)]*)\)/)[1];
      let degress = eval(expression);
      return degress * Math.PI / 180;
    });
  } catch (e) { }

  try {
    expression = expression.replace(/max\(.*\)/g, function (match) {
      let rango = match.match(/^max\((.*)\)/)[1];
      let result = eval(rango);
      return Math.max(...result);
    });
  } catch (e) { }

  try {
    expression = expression.replace(/min\(.*\)/g, function (match) {
      let rango = match.match(/^min\((.*)\)/)[1];
      let result = eval(rango);
      return Math.min(...result);
    });
  } catch (e) { }

  try {
    expression = expression.replace(/sum\(\[.*\]\)/g, function (match) {
      let array_str = match.match(/^sum\((\[.*\])\)/)[1];
      let array = eval(array_str);
      return array.reduce((a, b) => a + b, 0);
    });
  } catch (e) { }

  try {
    expression = expression.replace(/cnt\(\[.*\]\)/g, function (match) {
      let array_str = match.match(/^cnt\((\[.*\])\)/)[1];
      let array = eval(array_str);
      return array.length;
    });
  } catch (e) { }

  try {
    expression = expression.replace(/avg\(\[.*\]\)/g, function (match) {
      let array_str = match.match(/^avg\((\[.*\])\)/)[1];
      let array = eval(array_str);
      return array.reduce((a, b) => a + b, 0)/array.length;
    });
  } catch (e) { }

  try {
    expression = expression.replace(/(-?\d+\.?\d*\s?\+\s?\d+\.?\d*\s?%)/g, function (match) {
      let parts = match.match(/(-?\d+\.?\d*)\s?(\+\s?(\d+\.?\d*)?\s?%)/);
      let base = parseFloat(parts[1]);
      let percent = parseFloat(parts[3]);
      let result = base + (base * percent / 100);
      return result;
    });
  } catch (e) { }

  try {
    expression = expression.replace(/(-?\d+\.?\d*\s?-\s?\d+\.?\d*\s?%)/g, function (match) {
      let parts = match.match(/(-?\d+\.?\d*)\s?(-\s?(\d+\.?\d*)?\s?%)/);
      let base = parseFloat(parts[1]);
      let percent = parseFloat(parts[3]);
      let result = base - (base * percent / 100);
      return result;
    });
  } catch (e) { }

  try {
    expression = expression.replace(/(\d+\.?\d*%\s*\(.*\))/g, function (match) {
      let parts = match.match(/(\d+\.?\d*)%\s*\((.*)\)/);
      let percent = parseFloat(parts[1]);
      let base = eval(parts[2]);
      let result = base * percent / 100;
      return result;
    });
  } catch (e) { }

  expression = expression.replace(/--/g, function (match) {
    return "+";
  });

  return expression;
}

function dragOverTrash(event) {
  event.preventDefault();
}

function dropTrash(event) {
  event.preventDefault();
  dragElement.parentNode.removeChild(dragElement);
}

function applyTemplate(input) {
  const template_name = input.value.match(/@\s?([a-zA-Z]+[a-zA-Z0-9_]*)\s*=$/)[1];
  fetch(`https://padcalc.com/templates/${template_name.toLowerCase()}.json`)
    .then(response => response.json())
    .then(data => applyTemplateFromJson(input, data));
}

function applyTemplateFromJson(input, data) {
  data.variables.forEach(variable => {
    let [key, value] = variable.split(':');
    variables[key.trim()] ||= Number(value);
  });
  input.value = data.formula;
  displayVariables();
  process_cmd(input);
}
