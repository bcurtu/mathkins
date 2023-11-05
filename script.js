let variables = {};
let assignedVariableNames = [];

document.addEventListener('DOMContentLoaded', (event) => {
  loadState();
  bind_events();
});

function addTextInput(x, y) {
  const input = document.createElement('input');
  input.style.position = 'absolute';
  input.style.left = x + 'px';
  input.style.top = y + 'px';
  input.classList.add('expression');
  add_keyup(input, x, y)
  document.body.appendChild(input);
  input.focus();
  input.addEventListener('focusout', function () {
    if (input.value.trim() === '') {
      document.body.removeChild(input);
    }
  });
}

function process_cmd(input) {
  const value = input.value;
  const assignmentMatch = value.match(/=?(\d+\.?\d*)->([a-zA-Z]+)$/);
  if (assignmentMatch) {
    assignment(assignmentMatch[1], assignmentMatch[2].trim());
  } else {
    const result = calculate(value);
    if (result) {
      input.value = `${value}${result}`;
      adjust_width(input);
      saveState();
    }
  }
}

function assignment(variableValue, variableName) {
  if (variableName in variables && !(assignedVariableNames.includes(variableName))) {
    alert('Error: This variable name is already in use.');
    return;
  }

  if (variables[variableName] != variableValue) {
    variables[variableName] = variableValue;
    if (!assignedVariableNames.includes(variableName)) {
      assignedVariableNames.push(variableName);
    }
    displayVariables();
    recalculate_variable(variableName);
    saveState();
  }
}

function recalculation(operations_chain) {
  const parts = operations_chain.split('=');
  for(let i = 0; i < parts.length; i++) {
    let left = parts[i]
    const assignmentMatch = left.match(/=?(\d+\.?\d*)->([a-zA-Z]+)$/);
    if (assignmentMatch) {
      assignment(assignmentMatch[1], assignmentMatch[2].trim());
      break;
    }
    let result = calculate(`${left}=`, false)
    let right_operation = parts[i+1]
    if (right_operation == undefined || right_operation === "") {
      break
    }
    let rest = right_operation.match(/(\d+\.?\d*)(.*)/)[2]
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

    expression = expression.replace(/[a-zA-Z]+/g, function (match) {
      if (match in variables) {
        return variables[match];
      } else {
        return match;
      }
    });

    if (!/^[\d+\-*/.\s()]*$/.test(expression)) {
      if (noisy) alert('Invalid expression');
      return;
    }

    let result = eval(expression);
    if (Number.isFinite(result)) {
      if (Math.floor(result) === result) {
        result = parseInt(result, 10);
      } else {
        result = result.toFixed(2);
      }
    }
    return result;
  }
}

function displayVariables() {
  const variablesContainer = document.getElementById('variablesContainer');
  variablesContainer.innerHTML = ''; // Clear the container

  const variableNames = Object.keys(variables).sort();

  for (const variableName of variableNames) {
    const variableValue = variables[variableName];

    const variableElement = document.createElement('p');
    variableElement.textContent = `${variableName}: ${variableValue}`;
    if (assignedVariableNames.includes(variableName)) {
      variableElement.style.fontStyle = 'italic';
    }
    variablesContainer.appendChild(variableElement);
  }
}

function addVariable() {
  const newVariableInput = document.getElementById('newVariableInput');
  const variableMatch = newVariableInput.value.match(/([a-zA-Z]+):\s*(\d+\.?\d*)$/);

  if (variableMatch) {
    const variableName = variableMatch[1];
    const variableValue = Number(variableMatch[2]);

    if (assignedVariableNames.includes(variableName)) {
      alert('Error: This variable name is used in the operations.');
      return;
    }
    variables[variableName] = variableValue;

    displayVariables();
    recalculate_variable(variableName);
    saveState();
  } else {
    alert('Invalid variable format. Please use the format "v: 12".');
  }

  newVariableInput.value = '';
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
}

function loadState() {
  const inputs = JSON.parse(localStorage.getItem('inputs')) || [];

  inputs.forEach(inputData => {
    const input = document.createElement('input');
    input.value = inputData.value;
    input.style.position = 'absolute'; // Position the input absolutely
    input.style.top = inputData.top;
    input.style.left = inputData.left;
    input.classList.add('expression');
    add_keyup(input, inputData.top, inputData.left);
    adjust_width(input);

    document.body.appendChild(input);
  });

  Object.assign(variables, JSON.parse(localStorage.getItem('variables')) || {});
  Object.assign(assignedVariableNames, JSON.parse(localStorage.getItem('assignedVariableNames')) || []);
  displayVariables();
}

function add_keyup(input, x, y) {
  input.addEventListener('keyup', function (event) {
    if (event.key === '=' || event.key === 'Enter') {
      process_cmd(input);
    }
    adjust_width(input);
  });
}

function adjust_width(input) {
  const preWidth = input.offsetWidth;
  const newWidth = ((input.value.length + 1) * 16);
  if (preWidth < newWidth) {
    input.style.width = newWidth + 'px';
  }
}

function reset() {
  if (confirm('Are you sure you want to reset?\nAll the calculations and variables will be lost.')) {
    localStorage.removeItem('inputs');
    localStorage.removeItem('variables');
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
  document.getElementById('resetButton').addEventListener('click', reset);
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
    let words = input.value.match(/[a-z]+/gi);

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

function recalculate_variable(variable) {
  let inputs = selectInputsWithVariable(variable);
  for (let i = 0; i < inputs.length; i++) {
    let input = inputs[i];
    if (input.value.includes("=")) {
      let result = recalculation(input.value);
      if (result) {
        input.value = result;
        adjust_width(input);
        saveState();
      }
    }
  }
}
