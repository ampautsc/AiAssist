// Character Creator Logic

let characterData = {
    name: '',
    race: '',
    subrace: '',
    class: '',
    subclass: '',
    level: 1,
    background: '',
    alignment: '',
    abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10
    },
    abilityMethod: '',
    hp: 0,
    ac: 10,
    proficiency_bonus: 2,
    skills: {},
    features: [],
    equipment: [],
    xp: 0
};

let currentStep = 1;

// Step Navigation
function nextStep(step) {
    document.getElementById(`step${currentStep}`).style.display = 'none';
    document.getElementById(`step${step}`).style.display = 'block';
    currentStep = step;
    updateProgressBar();
    
    // Load data for the current step
    if (step === 2) loadRaces();
    if (step === 3) loadClasses();
    if (step === 4) loadBackgrounds();
    if (step === 6) showCharacterSummary();
}

function previousStep(step) {
    document.getElementById(`step${currentStep}`).style.display = 'none';
    document.getElementById(`step${step}`).style.display = 'block';
    currentStep = step;
    updateProgressBar();
}

function updateProgressBar() {
    const progress = (currentStep / 6) * 100;
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `Step ${currentStep} of 6`;
}

// Ability Score Methods
function selectAbilityMethod(method) {
    characterData.abilityMethod = method;
    const inputDiv = document.getElementById('abilityScoreInput');
    
    if (method === 'standard') {
        showStandardArray(inputDiv);
    } else if (method === 'pointbuy') {
        showPointBuy(inputDiv);
    } else if (method === 'manual') {
        showManualEntry(inputDiv);
    } else if (method === 'roll') {
        showRollMethod(inputDiv);
    }
    
    inputDiv.style.display = 'block';
}

function showStandardArray(container) {
    const standardArray = [15, 14, 13, 12, 10, 8];
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    
    let html = '<h5>Assign the standard array to your abilities:</h5>';
    html += '<p>Available scores: 15, 14, 13, 12, 10, 8</p>';
    
    abilities.forEach(ability => {
        html += `
            <div class="mb-3">
                <label class="form-label">${ability.charAt(0).toUpperCase() + ability.slice(1)}</label>
                <select class="form-select ability-select" data-ability="${ability}">
                    <option value="">Select...</option>
                    ${standardArray.map(score => `<option value="${score}">${score}</option>`).join('')}
                </select>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.ability-select').forEach(select => {
        select.addEventListener('change', validateStandardArray);
    });
}

function validateStandardArray() {
    const selects = document.querySelectorAll('.ability-select');
    const selectedValues = Array.from(selects).map(s => parseInt(s.value) || 0);
    const standardArray = [15, 14, 13, 12, 10, 8];
    
    // Check if all abilities are assigned
    if (selectedValues.includes(0) || selectedValues.length !== 6) {
        document.getElementById('step1Next').disabled = true;
        return;
    }
    
    // Check for duplicates and valid values
    const sortedSelected = [...selectedValues].sort((a, b) => b - a);
    const sortedStandard = [...standardArray].sort((a, b) => b - a);
    
    if (JSON.stringify(sortedSelected) === JSON.stringify(sortedStandard)) {
        // Valid assignment - update character data
        selects.forEach(select => {
            const ability = select.dataset.ability;
            characterData.abilities[ability] = parseInt(select.value);
        });
        document.getElementById('step1Next').disabled = false;
    } else {
        document.getElementById('step1Next').disabled = true;
    }
}

function showPointBuy(container) {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    
    let html = '<h5>Point Buy (27 points available)</h5>';
    html += '<p class="alert alert-info">Scores range from 8-15. Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9</p>';
    html += '<div id="pointsRemaining" class="alert alert-warning">Points remaining: 27</div>';
    
    abilities.forEach(ability => {
        html += `
            <div class="mb-3">
                <label class="form-label">${ability.charAt(0).toUpperCase() + ability.slice(1)}</label>
                <input type="number" class="form-control point-buy-input" 
                       data-ability="${ability}" min="8" max="15" value="8">
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.point-buy-input').forEach(input => {
        input.addEventListener('input', validatePointBuy);
    });
    
    validatePointBuy();
}

function validatePointBuy() {
    const costs = {8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9};
    const inputs = document.querySelectorAll('.point-buy-input');
    
    let totalCost = 0;
    inputs.forEach(input => {
        const value = parseInt(input.value) || 8;
        totalCost += costs[value] || 0;
        characterData.abilities[input.dataset.ability] = value;
    });
    
    const pointsRemaining = 27 - totalCost;
    document.getElementById('pointsRemaining').textContent = `Points remaining: ${pointsRemaining}`;
    
    if (pointsRemaining === 0) {
        document.getElementById('pointsRemaining').className = 'alert alert-success';
        document.getElementById('step1Next').disabled = false;
    } else if (pointsRemaining < 0) {
        document.getElementById('pointsRemaining').className = 'alert alert-danger';
        document.getElementById('step1Next').disabled = true;
    } else {
        document.getElementById('pointsRemaining').className = 'alert alert-warning';
        document.getElementById('step1Next').disabled = true;
    }
}

function showManualEntry(container) {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    
    let html = '<h5>Enter your ability scores manually:</h5>';
    
    abilities.forEach(ability => {
        html += `
            <div class="mb-3">
                <label class="form-label">${ability.charAt(0).toUpperCase() + ability.slice(1)}</label>
                <input type="number" class="form-control manual-input" 
                       data-ability="${ability}" min="1" max="20" value="10">
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.manual-input').forEach(input => {
        input.addEventListener('input', () => {
            characterData.abilities[input.dataset.ability] = parseInt(input.value) || 10;
        });
    });
    
    document.getElementById('step1Next').disabled = false;
}

function showRollMethod(container) {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    
    let html = '<h5>Roll 4d6 drop lowest for each ability:</h5>';
    
    abilities.forEach(ability => {
        html += `
            <div class="mb-3">
                <label class="form-label">${ability.charAt(0).toUpperCase() + ability.slice(1)}</label>
                <div class="input-group">
                    <input type="number" class="form-control" id="roll-${ability}" readonly>
                    <button class="btn btn-primary" onclick="rollAbility('${ability}')">
                        <i class="bi bi-dice-6"></i> Roll
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '<button class="btn btn-secondary" onclick="rollAllAbilities()">Roll All</button>';
    
    container.innerHTML = html;
    document.getElementById('step1Next').disabled = true;
}

function rollAbility(ability) {
    const rolls = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
    ];
    
    rolls.sort((a, b) => a - b);
    const total = rolls[1] + rolls[2] + rolls[3]; // Drop lowest
    
    document.getElementById(`roll-${ability}`).value = total;
    characterData.abilities[ability] = total;
    
    // Check if all abilities are rolled
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const allRolled = abilities.every(ab => document.getElementById(`roll-${ab}`).value);
    document.getElementById('step1Next').disabled = !allRolled;
}

function rollAllAbilities() {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    abilities.forEach(ability => rollAbility(ability));
}

// Load Races
function loadRaces() {
    fetch('/api/races')
        .then(response => response.json())
        .then(races => {
            displayRaces(races);
        })
        .catch(error => {
            document.getElementById('raceList').innerHTML = '<p class="text-danger">Error loading races. Please check that races.json exists.</p>';
        });
}

function displayRaces(races) {
    const container = document.getElementById('raceList');
    
    if (Object.keys(races).length === 0) {
        container.innerHTML = '<p class="text-warning">No races data available yet. Coming soon!</p>';
        return;
    }
    
    let html = '<div class="row">';
    
    for (const [raceName, raceData] of Object.entries(races)) {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card selection-card" onclick="selectRace('${raceName}')">
                    <div class="card-body">
                        <h5 class="card-title">${raceName}</h5>
                        <p class="card-text small">${raceData.description || 'No description'}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function selectRace(race) {
    characterData.race = race;
    
    // Highlight selected card
    document.querySelectorAll('#raceList .selection-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    document.getElementById('step2Next').disabled = false;
}

// Load Classes
function loadClasses() {
    fetch('/api/classes')
        .then(response => response.json())
        .then(classes => {
            displayClasses(classes);
        })
        .catch(error => {
            document.getElementById('classList').innerHTML = '<p class="text-danger">Error loading classes. Please check that classes.json exists.</p>';
        });
}

function displayClasses(classes) {
    const container = document.getElementById('classList');
    
    if (Object.keys(classes).length === 0) {
        container.innerHTML = '<p class="text-warning">No classes data available yet. Coming soon!</p>';
        return;
    }
    
    let html = '<div class="row">';
    
    for (const [className, classData] of Object.entries(classes)) {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card selection-card" onclick="selectClass('${className}')">
                    <div class="card-body">
                        <h5 class="card-title">${className}</h5>
                        <p class="card-text small">${classData.description || 'No description'}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function selectClass(charClass) {
    characterData.class = charClass;
    
    // Highlight selected card
    document.querySelectorAll('#classList .selection-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    document.getElementById('step3Next').disabled = false;
}

// Load Backgrounds
function loadBackgrounds() {
    fetch('/api/backgrounds')
        .then(response => response.json())
        .then(backgrounds => {
            displayBackgrounds(backgrounds);
        })
        .catch(error => {
            document.getElementById('backgroundList').innerHTML = '<p class="text-danger">Error loading backgrounds. Please check that backgrounds.json exists.</p>';
        });
}

function displayBackgrounds(backgrounds) {
    const container = document.getElementById('backgroundList');
    
    if (Object.keys(backgrounds).length === 0) {
        container.innerHTML = '<p class="text-warning">No backgrounds data available yet. Coming soon!</p>';
        return;
    }
    
    let html = '<div class="row">';
    
    for (const [bgName, bgData] of Object.entries(backgrounds)) {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card selection-card" onclick="selectBackground('${bgName}')">
                    <div class="card-body">
                        <h5 class="card-title">${bgName}</h5>
                        <p class="card-text small">${bgData.description || 'No description'}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function selectBackground(background) {
    characterData.background = background;
    
    // Highlight selected card
    document.querySelectorAll('#backgroundList .selection-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    document.getElementById('step4Next').disabled = false;
}

// Show Character Summary
function showCharacterSummary() {
    characterData.name = document.getElementById('charName').value || 'Unnamed Character';
    characterData.alignment = document.getElementById('alignment').value;
    
    const container = document.getElementById('characterSummary');
    
    let html = '<h4>Character Summary</h4>';
    html += `<p><strong>Name:</strong> ${characterData.name}</p>`;
    html += `<p><strong>Race:</strong> ${characterData.race}</p>`;
    html += `<p><strong>Class:</strong> ${characterData.class}</p>`;
    html += `<p><strong>Background:</strong> ${characterData.background}</p>`;
    html += `<p><strong>Alignment:</strong> ${characterData.alignment}</p>`;
    
    html += '<h5>Ability Scores:</h5><div class="row">';
    for (const [ability, score] of Object.entries(characterData.abilities)) {
        const modifier = Math.floor((score - 10) / 2);
        const modStr = modifier >= 0 ? `+${modifier}` : modifier;
        html += `
            <div class="col-md-2">
                <div class="ability-score">
                    <p>${ability.substring(0, 3).toUpperCase()}</p>
                    <h3>${score}</h3>
                    <p>${modStr}</p>
                </div>
            </div>
        `;
    }
    html += '</div>';
    
    container.innerHTML = html;
}

// Save Character
function saveCharacter() {
    if (!characterData.name) {
        characterData.name = prompt('Enter character name:') || 'Unnamed Character';
    }
    
    fetch('/api/character/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(characterData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Character saved successfully!');
            window.location.href = `/character/${data.filename}`;
        } else {
            alert('Error saving character');
        }
    });
}
