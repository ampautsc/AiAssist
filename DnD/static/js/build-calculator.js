// Build Calculator JavaScript

let builds = [];
let dprChart = null;

// Weapon damage data
const weapons = {
    'longbow': { dice: 8, count: 1, name: 'Longbow' },
    'shortbow': { dice: 6, count: 1, name: 'Shortbow' },
    'hand_crossbow': { dice: 6, count: 1, name: 'Hand Crossbow' },
    'light_crossbow': { dice: 8, count: 1, name: 'Light Crossbow' },
    'heavy_crossbow': { dice: 10, count: 1, name: 'Heavy Crossbow' }
};

// Calculate ability modifier
function calculateModifier(abilityScore) {
    return Math.floor((abilityScore - 10) / 2);
}

// Calculate proficiency bonus
function calculateProficiencyBonus(level) {
    return 2 + Math.floor((level - 1) / 4);
}

// Calculate to-hit bonus
function calculateToHit(level, abilityMod, magicBonus, sharpshooter) {
    const profBonus = calculateProficiencyBonus(level);
    const penalty = sharpshooter ? -5 : 0;
    return abilityMod + profBonus + magicBonus + penalty;
}

// Calculate hit chance
function calculateHitChance(toHit, targetAC) {
    const neededRoll = targetAC - toHit;
    
    if (neededRoll <= 1) return 0.95; // Always hit except nat 1
    if (neededRoll >= 20) return 0.05; // Only hit on nat 20
    
    return (21 - neededRoll) / 20;
}

// Calculate DPR
function calculateDPR(buildConfig) {
    const level = parseInt(buildConfig.level);
    const abilityScore = parseInt(buildConfig.abilityScore);
    const abilityMod = calculateModifier(abilityScore);
    const weapon = weapons[buildConfig.weapon];
    const magicBonus = parseInt(buildConfig.magicBonus);
    const sharpshooter = buildConfig.sharpshooter;
    const crossbowExpert = buildConfig.crossbowExpert;
    const attacksPerRound = parseInt(buildConfig.attacksPerRound);
    const targetAC = parseInt(buildConfig.targetAC);
    
    // Calculate to-hit
    const toHit = calculateToHit(level, abilityMod, magicBonus, sharpshooter);
    
    // Calculate damage per hit
    const weaponDamageAvg = weapon.count * ((weapon.dice + 1) / 2);
    const sharpshooterDamage = sharpshooter ? 10 : 0;
    const damagePerHit = weaponDamageAvg + abilityMod + magicBonus + sharpshooterDamage;
    
    // Calculate hit chance
    const hitChance = calculateHitChance(toHit, targetAC);
    
    // Critical hits
    const critDamage = weaponDamageAvg;
    const critChance = 0.05;
    
    // Expected damage per attack
    const expectedPerAttack = (hitChance * damagePerHit) + (critChance * critDamage);
    
    // Total attacks
    let totalAttacks = attacksPerRound;
    if (crossbowExpert && buildConfig.weapon === 'hand_crossbow') {
        totalAttacks += 1; // Bonus action attack
    }
    
    const dpr = expectedPerAttack * totalAttacks;
    
    return {
        dpr: Math.round(dpr * 100) / 100,
        toHit: toHit,
        hitChance: Math.round(hitChance * 1000) / 10,
        damagePerHit: Math.round(damagePerHit * 100) / 100,
        attacksPerRound: totalAttacks,
        expectedPerAttack: Math.round(expectedPerAttack * 100) / 100
    };
}

// Add build to comparison
function addBuild() {
    const buildConfig = {
        name: document.getElementById('buildName').value,
        level: document.getElementById('level').value,
        class: document.getElementById('classSelect').value,
        subclass: document.getElementById('subclassSelect').value,
        abilityScore: document.getElementById('abilityScore').value,
        weapon: document.getElementById('weaponSelect').value,
        magicBonus: document.getElementById('magicBonus').value,
        sharpshooter: document.getElementById('sharpshooter').checked,
        crossbowExpert: document.getElementById('crossbowExpert').checked,
        attacksPerRound: document.getElementById('attacksPerRound').value,
        targetAC: document.getElementById('targetAC').value
    };
    
    const results = calculateDPR(buildConfig);
    
    builds.push({
        config: buildConfig,
        results: results
    });
    
    updateComparison();
    updateChart();
}

// Update comparison display
function updateComparison() {
    const container = document.getElementById('comparisonResults');
    
    if (builds.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Add builds to compare them side by side</p>';
        return;
    }
    
    // Sort by DPR
    builds.sort((a, b) => b.results.dpr - a.results.dpr);
    
    let html = '<div class="table-responsive"><table class="table table-striped table-hover">';
    html += '<thead><tr>';
    html += '<th>Rank</th><th>Build Name</th><th>DPR</th><th>To Hit</th><th>Hit %</th>';
    html += '<th>Damage/Hit</th><th>Attacks</th><th>Details</th><th>Action</th>';
    html += '</tr></thead><tbody>';
    
    builds.forEach((build, index) => {
        const config = build.config;
        const results = build.results;
        
        const feats = [];
        if (config.sharpshooter) feats.push('Sharpshooter');
        if (config.crossbowExpert) feats.push('Crossbow Expert');
        
        html += '<tr>';
        html += `<td><strong>#${index + 1}</strong></td>`;
        html += `<td><strong>${config.name}</strong><br><small class="text-muted">Lvl ${config.level} ${config.subclass}</small></td>`;
        html += `<td><span class="badge bg-success fs-6">${results.dpr}</span></td>`;
        html += `<td>+${results.toHit}</td>`;
        html += `<td>${results.hitChance}%</td>`;
        html += `<td>${results.damagePerHit}</td>`;
        html += `<td>${results.attacksPerRound}</td>`;
        html += `<td><small>${weapons[config.weapon].name}`;
        if (config.magicBonus > 0) html += ` +${config.magicBonus}`;
        if (feats.length > 0) html += `<br>${feats.join(', ')}`;
        html += `</small></td>`;
        html += `<td><button class="btn btn-sm btn-danger" onclick="removeBuild(${index})"><i class="bi bi-trash"></i></button></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    // Add insights
    if (builds.length >= 2) {
        const best = builds[0];
        const dprDiff = best.results.dpr - builds[1].results.dpr;
        
        html += '<div class="alert alert-info mt-3">';
        html += `<strong><i class="bi bi-lightbulb"></i> Analysis:</strong> `;
        html += `<strong>${best.config.name}</strong> deals ${dprDiff.toFixed(2)} more DPR than the next best build. `;
        
        if (best.results.hitChance < 60) {
            html += 'However, the hit chance is below 60% - consider dropping Sharpshooter for more consistent damage. ';
        }
        
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// Update DPR chart
function updateChart() {
    const ctx = document.getElementById('dprChart');
    
    if (dprChart) {
        dprChart.destroy();
    }
    
    const labels = builds.map(b => b.config.name);
    const dprData = builds.map(b => b.results.dpr);
    const hitChanceData = builds.map(b => b.results.hitChance);
    
    dprChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'DPR',
                    data: dprData,
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Hit Chance %',
                    data: hitChanceData,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'DPR'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Hit Chance %'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Remove build
function removeBuild(index) {
    builds.splice(index, 1);
    updateComparison();
    updateChart();
}

// Load template builds
function loadTemplate(templateName) {
    const templates = {
        'valorSharpshooter': {
            name: 'Valor Sharpshooter',
            level: 8,
            class: 'bard',
            subclass: 'valor',
            abilityScore: 18,
            weapon: 'longbow',
            magicBonus: 1,
            sharpshooter: true,
            crossbowExpert: false,
            attacksPerRound: 2,
            targetAC: 16
        },
        'valorCrossbowExpert': {
            name: 'Valor Crossbow Expert',
            level: 8,
            class: 'bard',
            subclass: 'valor',
            abilityScore: 18,
            weapon: 'hand_crossbow',
            magicBonus: 1,
            sharpshooter: false,
            crossbowExpert: true,
            attacksPerRound: 2,
            targetAC: 16
        },
        'loreBard': {
            name: 'Lore Bard (Spell Focus)',
            level: 8,
            class: 'bard',
            subclass: 'lore',
            abilityScore: 20,
            weapon: 'light_crossbow',
            magicBonus: 0,
            sharpshooter: false,
            crossbowExpert: false,
            attacksPerRound: 1,
            targetAC: 16
        },
        'swordsBard': {
            name: 'Swords Bard',
            level: 8,
            class: 'bard',
            subclass: 'swords',
            abilityScore: 18,
            weapon: 'shortbow',
            magicBonus: 0,
            sharpshooter: false,
            crossbowExpert: false,
            attacksPerRound: 2,
            targetAC: 16
        }
    };
    
    const template = templates[templateName];
    if (!template) return;
    
    document.getElementById('buildName').value = template.name;
    document.getElementById('level').value = template.level;
    document.getElementById('classSelect').value = template.class;
    document.getElementById('subclassSelect').value = template.subclass;
    document.getElementById('abilityScore').value = template.abilityScore;
    document.getElementById('weaponSelect').value = template.weapon;
    document.getElementById('magicBonus').value = template.magicBonus;
    document.getElementById('sharpshooter').checked = template.sharpshooter;
    document.getElementById('crossbowExpert').checked = template.crossbowExpert;
    document.getElementById('attacksPerRound').value = template.attacksPerRound;
    document.getElementById('targetAC').value = template.targetAC;
}
