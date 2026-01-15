// Configuration
const CONFIG = {
    apiKey: 'AIzaSyBbulks6r4-Bd1baf8v-b0Fx-5zZngBlIo',
    spreadsheetId: '11l_J840GhoTlVfGormRLQhm_Qe2_SmpFibVEO5WFKik',
    requirementsRange: 'Sheet1!A:U',
    alevelsRange: 'A levels!A:A',
    ibRange: 'IBs!A:A',
    apRange: 'APs!A:A'
};

let allData = [];
let currentUniversity = '';
let currentFilter = 'all';
let currentQualification = 'alevels';
let subjectLists = {
    alevels: [],
    ib: [],
    ap: []
};
let subjectCounter = 0;
let fourthAlevelAdded = false;

// Grade options
const gradeOptions = {
    alevels: ['A*', 'A', 'B', 'C', 'D', 'E'],
    ib: ['7', '6', '5', '4', '3', '2', '1'],
    ap: ['5', '4', '3', '2', '1']
};

// Grade comparison for A-Levels
const gradeOrder = ['A*', 'A', 'B', 'C', 'D', 'E'];

// ============= SUBJECT NAME NORMALIZATION =============

function normalizeSubjectName(subject) {
    const normalizations = {
        // A-Level normalizations
        'Mathematics': 'Maths',
        'Further Mathematics': 'Further Maths',
        'Physical Education': 'PE',
        'Design and Technology': 'Design Technology',
        'Religious Studies': 'Religious Education',
        
        // IB normalizations
        'Mathematics: Analysis and Approaches': 'Maths',
        'Mathematics: Applications and Interpretation': 'Maths',
        
        // AP normalizations
        'Calculus BC': 'Calculus BC',
        'Calculus AB': 'Calculus AB',
    };
    
    return normalizations[subject] || subject;
}

// ============= END SUBJECT NAME NORMALIZATION =============

// ============= MATCHING ALGORITHM =============

function isSTEMSubject(subject) {
    const stemSubjects = [
        'Mathematics', 'Further Mathematics', 'Physics', 'Chemistry', 'Biology',
        'Computer Science', 'Economics', 'Psychology'
    ];
    return stemSubjects.some(stem => subject.includes(stem));
}

function isHumanitiesSubject(subject) {
    const humanitiesSubjects = [
        'English', 'History', 'Geography', 'Classics', 'Latin', 'Greek',
        'French', 'German', 'Spanish', 'Italian', 'Chinese', 'Japanese',
        'Philosophy', 'Religious Studies', 'Theology', 'Art', 'Music', 'Drama'
    ];
    return humanitiesSubjects.some(hum => subject.includes(hum));
}

function isSocialSciencesSubject(subject) {
    const socialSciencesSubjects = [
        'Economics', 'Politics', 'Sociology', 'Psychology', 'Geography',
        'Business', 'Anthropology', 'Law'
    ];
    return socialSciencesSubjects.some(soc => subject.includes(soc));
}

function getSubjectProfile(subjects) {
    const profile = {
        stem: 0,
        humanities: 0,
        socialSciences: 0
    };
    
    subjects.forEach(subject => {
        if (isSTEMSubject(subject)) profile.stem++;
        if (isHumanitiesSubject(subject)) profile.humanities++;
        if (isSocialSciencesSubject(subject)) profile.socialSciences++;
    });
    
    return profile;
}

function checkSubjectProfileCompatibility(userProfile, courseClassification) {
    const profile = getSubjectProfile(userProfile.subjects);
    
    // For A-Levels: if user is all STEM and course is Humanities/Social Sciences
    if (profile.stem >= 3 && profile.humanities === 0 && profile.socialSciences === 0) {
        if (courseClassification === 'Humanities' || courseClassification === 'Social Sciences') {
            return {
                compatible: false,
                reason: 'Your subject profile (all STEM) is not typically suitable for this Humanities/Social Sciences course'
            };
        }
    }
    
    // If user is all Humanities and course is STEM
    if (profile.humanities >= 3 && profile.stem === 0) {
        if (courseClassification === 'STEM') {
            return {
                compatible: false,
                reason: 'Your subject profile (no STEM subjects) is not suitable for this STEM course'
            };
        }
    }
    
    return { compatible: true };
}

function getUserProfile() {
    const qual = currentQualification;
    let profile = {
        qualification: qual,
        subjects: [],
        grades: {},
        valid: false
    };

    if (qual === 'alevels') {
        const container = document.getElementById('alevels-subjects');
        const rows = container.querySelectorAll('.subject-row');
        
        rows.forEach(row => {
            const subjectSelect = row.querySelector('select:first-child');
            const gradeSelect = row.querySelector('.grade-select');
            
            if (subjectSelect && gradeSelect && subjectSelect.value && gradeSelect.value) {
                const normalizedSubject = normalizeSubjectName(subjectSelect.value);
                profile.subjects.push(normalizedSubject);
                profile.grades[normalizedSubject] = gradeSelect.value;
            }
        });

        if (profile.subjects.length >= 3) {
            profile.valid = true;
            profile.overallGrades = Object.values(profile.grades).sort((a, b) => 
                gradeOrder.indexOf(a) - gradeOrder.indexOf(b)
            ).slice(0, 3).join('');
        }

    } else if (qual === 'ib') {
        const hlRows = document.getElementById('ib-hl-subjects').querySelectorAll('.subject-row');
        const slRows = document.getElementById('ib-sl-subjects').querySelectorAll('.subject-row');
        
        profile.hlSubjects = [];
        profile.hlGrades = {};
        profile.slSubjects = [];
        profile.slGrades = {};
        
        hlRows.forEach(row => {
            const subjectSelect = row.querySelector('select:first-child');
            const gradeSelect = row.querySelector('.grade-select');
            
            if (subjectSelect && gradeSelect && subjectSelect.value && gradeSelect.value) {
                const normalizedSubject = normalizeSubjectName(subjectSelect.value);
                profile.hlSubjects.push(normalizedSubject);
                profile.hlGrades[normalizedSubject] = parseInt(gradeSelect.value);
                profile.subjects.push(normalizedSubject);
                profile.grades[normalizedSubject] = parseInt(gradeSelect.value);
            }
        });

        slRows.forEach(row => {
            const subjectSelect = row.querySelector('select:first-child');
            const gradeSelect = row.querySelector('.grade-select');
            
            if (subjectSelect && gradeSelect && subjectSelect.value && gradeSelect.value) {
                const normalizedSubject = normalizeSubjectName(subjectSelect.value);
                profile.slSubjects.push(normalizedSubject);
                profile.slGrades[normalizedSubject] = parseInt(gradeSelect.value);
                profile.subjects.push(normalizedSubject);
                profile.grades[normalizedSubject] = parseInt(gradeSelect.value);
            }
        });

        if (profile.hlSubjects.length === 3 && profile.slSubjects.length === 3) {
            profile.valid = true;
            profile.totalPoints = Object.values(profile.grades).reduce((sum, g) => sum + g, 0);
            profile.hlPattern = Object.values(profile.hlGrades).sort((a, b) => b - a).join('');
        }

    } else if (qual === 'ap') {
        const container = document.getElementById('ap-subjects');
        const rows = container.querySelectorAll('.subject-row');
        
        rows.forEach(row => {
            const subjectSelect = row.querySelector('select:first-child');
            const gradeSelect = row.querySelector('.grade-select');
            
            if (subjectSelect && gradeSelect && subjectSelect.value && gradeSelect.value) {
                const normalizedSubject = normalizeSubjectName(subjectSelect.value);
                profile.subjects.push(normalizedSubject);
                profile.grades[normalizedSubject] = parseInt(gradeSelect.value);
            }
        });

        const satScore = document.getElementById('sat-score').value;
        if (satScore) {
            profile.satScore = parseInt(satScore);
        }

        if (profile.subjects.length >= 3) {
            profile.valid = true;
        }
    }

    return profile;
}

function compareALevelGrades(userGrade, requiredGrade) {
    const userIndex = gradeOrder.indexOf(userGrade);
    const requiredIndex = gradeOrder.indexOf(requiredGrade);
    return requiredIndex - userIndex; // Positive if user grade is better or equal
}

function meetsALevelGradeRequirement(userGrades, requiredPattern) {
    // userGrades is like "A*AB", requiredPattern is like "A*AA"
    if (!userGrades || !requiredPattern) return false;
    
    const userArray = userGrades.split('');
    const requiredArray = requiredPattern.split('');
    
    for (let i = 0; i < requiredArray.length; i++) {
        if (!userArray[i] || compareALevelGrades(userArray[i], requiredArray[i]) < 0) {
            return false;
        }
    }
    return true;
}

function parseSubjectRequirement(reqString, minFromOptions) {
    if (!reqString || reqString.trim() === '') {
        return null;
    }
    
    // Split by semicolon for AND logic
    if (reqString.includes(';')) {
        const parts = reqString.split(';').map(s => s.trim());
        return {
            type: 'all_required',
            requirements: parts.map(part => parseSubjectRequirement(part, minFromOptions))
        };
    }
    
    // Split by pipe for OR logic
    if (reqString.includes('|')) {
        const subjects = reqString.split('|').map(s => s.trim());
        const minRequired = minFromOptions ? parseInt(minFromOptions) : 1;
        
        return {
            type: minRequired === 1 ? 'any_one_of' : 'min_from_list',
            subjects: subjects,
            minRequired: minRequired
        };
    }
    
    // Single subject
    return {
        type: 'single',
        subject: reqString.trim()
    };
}

function checkSubjectRequirement(requirement, userSubjects) {
    if (!requirement) return { match: true };
    
    if (requirement.type === 'single') {
        if (userSubjects.includes(requirement.subject)) {
            return { match: true };
        } else {
            return { match: false, reason: `Missing required subject: ${requirement.subject}` };
        }
    }
    
    if (requirement.type === 'any_one_of' || requirement.type === 'min_from_list') {
        const matchingSubjects = requirement.subjects.filter(s => userSubjects.includes(s));
        
        if (matchingSubjects.length >= requirement.minRequired) {
            return { match: true, matchedSubjects: matchingSubjects };
        } else {
            const needed = requirement.minRequired === 1 ? 
                `one of: ${requirement.subjects.join(', ')}` :
                `${requirement.minRequired} from: ${requirement.subjects.join(', ')}`;
            return { 
                match: false, 
                reason: `Need ${needed} (you have ${matchingSubjects.length}: ${matchingSubjects.join(', ') || 'none'})` 
            };
        }
    }
    
    if (requirement.type === 'all_required') {
        for (let req of requirement.requirements) {
            const result = checkSubjectRequirement(req, userSubjects);
            if (!result.match) {
                return result;
            }
        }
        return { match: true };
    }
    
    return { match: true };
}

function checkSpecificGrades(gradeReqString, userProfile, isIB = false) {
    if (!gradeReqString || gradeReqString.trim() === '') {
        return { match: true };
    }
    
    // Split by semicolon for multiple requirements
    const requirements = gradeReqString.split(';').map(s => s.trim());
    
    for (let req of requirements) {
        // Format: "Subject1|Subject2|Subject3:Grade"
        const [subjectsPart, requiredGrade] = req.split(':');
        if (!subjectsPart || !requiredGrade) continue;
        
        const subjects = subjectsPart.split('|').map(s => s.trim());
        let foundMatch = false;
        
        for (let subject of subjects) {
            if (userProfile.subjects.includes(subject)) {
                const userGrade = userProfile.grades[subject];
                
                if (isIB) {
                    if (userGrade >= parseInt(requiredGrade)) {
                        foundMatch = true;
                        break;
                    }
                } else {
                    if (compareALevelGrades(userGrade, requiredGrade) >= 0) {
                        foundMatch = true;
                        break;
                    }
                }
            }
        }
        
        if (!foundMatch) {
            const subjectsUserHas = subjects.filter(s => userProfile.subjects.includes(s));
            if (subjectsUserHas.length === 0) {
                return { 
                    match: false, 
                    reason: `Need ${requiredGrade} in one of: ${subjects.join(', ')}` 
                };
            } else {
                const grades = subjectsUserHas.map(s => 
                    `${s} (${userProfile.grades[s]})`
                ).join(', ');
                return { 
                    match: false, 
                    reason: `Need ${requiredGrade} in ${subjects.join(' or ')} (you have: ${grades})` 
                };
            }
        }
    }
    
    return { match: true };
}

function matchALevels(userProfile, course) {
    // 0. Check if course has NO specific requirements - apply subject profile filter
    const hasNoSpecificRequirements = !course.AL_Required_Subjects || course.AL_Required_Subjects.trim() === '';
    
    if (hasNoSpecificRequirements) {
        const compatibilityCheck = checkSubjectProfileCompatibility(userProfile, course.Classification);
        if (!compatibilityCheck.compatible) {
            return { match: 'unlikely', reason: compatibilityCheck.reason };
        }
    }
    
    // 1. Check overall grades
    if (course.AL_Min_Grades && !meetsALevelGradeRequirement(userProfile.overallGrades, course.AL_Min_Grades)) {
        return { 
            match: 'unlikely', 
            reason: `Need ${course.AL_Min_Grades}, you have ${userProfile.overallGrades}` 
        };
    }
    
    // 2. Check required subjects
    const subjectReq = parseSubjectRequirement(course.AL_Required_Subjects, course.AL_Min_From_Options);
    const subjectCheck = checkSubjectRequirement(subjectReq, userProfile.subjects);
    
    if (!subjectCheck.match) {
        return { match: 'unlikely', reason: subjectCheck.reason };
    }
    
    // 3. Check specific subject grades
    const gradeCheck = checkSpecificGrades(course.AL_Subject_Specific_Grades, userProfile, false);
    
    if (!gradeCheck.match) {
        return { match: 'possible', reason: gradeCheck.reason };
    }
    
    return { match: 'strong', reason: 'Meets all requirements' };
}

function matchIB(userProfile, course) {
    // 0. Check if course has NO specific requirements - apply subject profile filter
    const hasNoSpecificRequirements = !course.IB_Required_HL_Subjects || course.IB_Required_HL_Subjects.trim() === '';
    
    if (hasNoSpecificRequirements) {
        const compatibilityCheck = checkSubjectProfileCompatibility(userProfile, course.Classification);
        if (!compatibilityCheck.compatible) {
            return { match: 'unlikely', reason: compatibilityCheck.reason };
        }
    }
    
    // 1. Check total points
    const minTotal = parseInt(course.IB_Min_Total);
    if (userProfile.totalPoints < minTotal) {
        return { 
            match: 'unlikely', 
            reason: `Need ${minTotal} points, you have ${userProfile.totalPoints}` 
        };
    }
    
    // 2. Check HL pattern
    const requiredHL = course.IB_Min_HL_Pattern;
    const userHL = userProfile.hlPattern;
    
    // Compare each digit
    for (let i = 0; i < requiredHL.length; i++) {
        if (parseInt(userHL[i]) < parseInt(requiredHL[i])) {
            return { 
                match: 'possible', 
                reason: `HL grades ${userHL} may not meet ${requiredHL}` 
            };
        }
    }
    
    // 3. Check required HL subjects
    const subjectReq = parseSubjectRequirement(course.IB_Required_HL_Subjects, course.IB_Min_From_Options);
    const subjectCheck = checkSubjectRequirement(subjectReq, userProfile.hlSubjects);
    
    if (!subjectCheck.match) {
        return { match: 'unlikely', reason: subjectCheck.reason + ' at HL' };
    }
    
    // 4. Check specific HL subject grades
    const gradeCheck = checkSpecificGrades(course.IB_Subject_Specific_Grades, userProfile, true);
    
    if (!gradeCheck.match) {
        return { match: 'possible', reason: gradeCheck.reason + ' at HL' };
    }
    
    return { match: 'strong', reason: 'Meets all requirements' };
}

function matchAP(userProfile, course) {
    // 0. Check if course has NO specific requirements - apply subject profile filter
    const hasNoSpecificRequirements = !course.AP_Required_Subjects || course.AP_Required_Subjects.trim() === '';
    
    if (hasNoSpecificRequirements) {
        const compatibilityCheck = checkSubjectProfileCompatibility(userProfile, course.Classification);
        if (!compatibilityCheck.compatible) {
            return { match: 'unlikely', reason: compatibilityCheck.reason };
        }
    }
    
    const minCount = parseInt(course.AP_Min_Count);
    const minGrade = parseInt(course.AP_Min_Grades);
    
    // Count APs at required grade
    const qualifyingAPs = Object.values(userProfile.grades).filter(g => g >= minGrade).length;
    
    // 1. Check if has enough APs OR has SAT
    const hasSAT = userProfile.satScore && userProfile.satScore >= parseInt(course.SAT_Min_Score);
    
    if (qualifyingAPs < minCount && !hasSAT) {
        return { 
            match: 'unlikely', 
            reason: `Need ${minCount} APs at grade ${minGrade} or SAT ${course.SAT_Min_Score}+ (you have ${qualifyingAPs} qualifying APs${userProfile.satScore ? ` and SAT ${userProfile.satScore}` : ''})` 
        };
    }
    
    // 2. Check required subjects
    const subjectReq = parseSubjectRequirement(course.AP_Required_Subjects, course.AP_Min_From_Options);
    const subjectCheck = checkSubjectRequirement(subjectReq, userProfile.subjects);
    
    if (!subjectCheck.match) {
        return { match: 'unlikely', reason: subjectCheck.reason };
    }
    
    // 3. Check if required subjects are at grade 5
    if (course.AP_Required_Subjects) {
        const requiredSubjects = course.AP_Required_Subjects.split(';').map(s => s.trim());
        for (let reqGroup of requiredSubjects) {
            const subjects = reqGroup.split('|').map(s => s.trim());
            let foundQualifying = false;
            
            for (let subject of subjects) {
                if (userProfile.subjects.includes(subject) && userProfile.grades[subject] >= minGrade) {
                    foundQualifying = true;
                    break;
                }
            }
            
            if (!foundQualifying) {
                return { 
                    match: 'possible', 
                    reason: `Need grade ${minGrade} in ${subjects.join(' or ')}` 
                };
            }
        }
    }
    
    return { match: 'strong', reason: 'Meets all requirements' };
}

function matchCourse(userProfile, course) {
    if (!userProfile.valid) return null;
    
    if (userProfile.qualification === 'alevels') {
        return matchALevels(userProfile, course);
    } else if (userProfile.qualification === 'ib') {
        return matchIB(userProfile, course);
    } else if (userProfile.qualification === 'ap') {
        return matchAP(userProfile, course);
    }
    
    return null;
}

function calculateMatches() {
    const userProfile = getUserProfile();
    
    if (!userProfile.valid) {
        document.getElementById('matching-results').classList.remove('active');
        return;
    }
    
    const matches = {
        strong: [],
        possible: [],
        unlikely: []
    };
    
    for (let course of allData) {
        const result = matchCourse(userProfile, course);
        
        if (result) {
            matches[result.match].push({
                course: course.Course,
                university: course.University,
                classification: course.Classification,
                reason: result.reason
            });
        }
    }
    
    displayMatches(matches);
}

function displayMatches(matches) {
    const container = document.getElementById('matches-content');
    const resultsSection = document.getElementById('matching-results');
    
    const totalMatches = matches.strong.length + matches.possible.length + matches.unlikely.length;
    
    if (totalMatches === 0) {
        container.innerHTML = '<div class="no-matches">No courses found. Try entering more grades or adjusting your profile.</div>';
        resultsSection.classList.add('active');
        return;
    }
    
    let html = '';
    
    // Strong matches
    if (matches.strong.length > 0) {
        html += `
            <div class="match-group">
                <div class="match-group-header">
                    <span class="match-icon strong">✅</span>
                    <span class="match-group-title strong">Strong Matches (${matches.strong.length})</span>
                </div>
                <ul class="match-list">
                    ${matches.strong.map(m => `
                        <li class="match-item strong">
                            <div class="match-course-name">${m.course}</div>
                            <div class="match-university">${m.university} • ${m.classification}</div>
                            <div class="match-reason">${m.reason}</div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Possible matches
    if (matches.possible.length > 0) {
        html += `
            <div class="match-group">
                <div class="match-group-header">
                    <span class="match-icon possible">⚠️</span>
                    <span class="match-group-title possible">Possible Matches (${matches.possible.length})</span>
                </div>
                <ul class="match-list">
                    ${matches.possible.map(m => `
                        <li class="match-item possible">
                            <div class="match-course-name">${m.course}</div>
                            <div class="match-university">${m.university} • ${m.classification}</div>
                            <div class="match-reason">${m.reason}</div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Unlikely matches (optional - show top 5)
    if (matches.unlikely.length > 0) {
        html += `
            <div class="match-group">
                <div class="match-group-header">
                    <span class="match-icon unlikely">❌</span>
                    <span class="match-group-title unlikely">Unlikely (${matches.unlikely.length})</span>
                </div>
                <ul class="match-list">
                    ${matches.unlikely.slice(0, 5).map(m => `
                        <li class="match-item unlikely">
                            <div class="match-course-name">${m.course}</div>
                            <div class="match-university">${m.university} • ${m.classification}</div>
                            <div class="match-reason">${m.reason}</div>
                        </li>
                    `).join('')}
                    ${matches.unlikely.length > 5 ? `
                        <li class="match-item unlikely" style="text-align: center; font-style: italic;">
                            ...and ${matches.unlikely.length - 5} more
                        </li>
                    ` : ''}
                </ul>
            </div>
        `;
    }
    
    container.innerHTML = html;
    resultsSection.classList.add('active');
}

// ============= END MATCHING ALGORITHM =============

// Fetch data from Google Sheets
async function fetchData(range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.spreadsheetId}/values/${range}?key=${CONFIG.apiKey}`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

// Parse spreadsheet data
function parseData(rows) {
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    return dataRows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });
}

// Load subject lists and initialize
async function loadSubjectLists() {
    const alevelsData = await fetchData(CONFIG.alevelsRange);
    const ibData = await fetchData(CONFIG.ibRange);
    const apData = await fetchData(CONFIG.apRange);

    if (alevelsData) {
        subjectLists.alevels = alevelsData.slice(1).map(row => row[0]).filter(s => s);
    }
    if (ibData) {
        subjectLists.ib = ibData.slice(1).map(row => row[0]).filter(s => s);
    }
    if (apData) {
        subjectLists.ap = apData.slice(1).map(row => row[0]).filter(s => s);
    }

    // Initialize A-Levels with 3 subjects
    initializeALevels();
    
    // Initialize IB with 3 HL and 3 SL
    initializeIB();
    
    // Add first AP subject
    addSubject('ap');
}

// Initialize A-Levels with 3 subjects
function initializeALevels() {
    const container = document.getElementById('alevels-subjects');
    for (let i = 0; i < 3; i++) {
        createAlevelRow(container);
    }
}

// Create A-Level row
function createAlevelRow(container) {
    const id = `subject-${subjectCounter++}`;
    const subjectRow = document.createElement('div');
    subjectRow.className = 'subject-row';
    subjectRow.id = id;

    const selectedSubjects = getSelectedSubjects('alevels');
    const availableSubjects = subjectLists.alevels.filter(s => !selectedSubjects.includes(s));
    
    let subjectOptions = `<option value="">Select subject...</option>`;
    availableSubjects.forEach(subject => {
        subjectOptions += `<option value="${subject}">${subject}</option>`;
    });

    let gradeOptionsHTML = `<option value="">Grade</option>`;
    gradeOptions.alevels.forEach(grade => {
        gradeOptionsHTML += `<option value="${grade}">${grade}</option>`;
    });

    subjectRow.innerHTML = `
        <select onchange="handleSubjectChange('alevels')">${subjectOptions}</select>
        <select class="grade-select" onchange="updateProfileSummary()">${gradeOptionsHTML}</select>
    `;

    container.appendChild(subjectRow);
}

// Add fourth A-Level
function addFourthAlevel() {
    if (fourthAlevelAdded) return;
    
    const container = document.getElementById('alevels-subjects');
    const id = `subject-${subjectCounter++}`;
    const subjectRow = document.createElement('div');
    subjectRow.className = 'subject-row';
    subjectRow.id = id;

    const selectedSubjects = getSelectedSubjects('alevels');
    const availableSubjects = subjectLists.alevels.filter(s => !selectedSubjects.includes(s));
    
    let subjectOptions = `<option value="">Select subject...</option>`;
    availableSubjects.forEach(subject => {
        subjectOptions += `<option value="${subject}">${subject}</option>`;
    });

    let gradeOptionsHTML = `<option value="">Grade</option>`;
    gradeOptions.alevels.forEach(grade => {
        gradeOptionsHTML += `<option value="${grade}">${grade}</option>`;
    });

    subjectRow.innerHTML = `
        <select onchange="handleSubjectChange('alevels')">${subjectOptions}</select>
        <select class="grade-select" onchange="updateProfileSummary()">${gradeOptionsHTML}</select>
        <button class="remove-subject-btn" onclick="removeFourthAlevel('${id}')">Remove</button>
    `;

    container.appendChild(subjectRow);
    fourthAlevelAdded = true;
    document.getElementById('alevels-add-btn').disabled = true;
}

// Remove fourth A-Level
function removeFourthAlevel(id) {
    document.getElementById(id).remove();
    fourthAlevelAdded = false;
    document.getElementById('alevels-add-btn').disabled = false;
    handleSubjectChange('alevels');
    updateProfileSummary();
}

// Initialize IB with 3 HL and 3 SL
function initializeIB() {
    const hlContainer = document.getElementById('ib-hl-subjects');
    const slContainer = document.getElementById('ib-sl-subjects');
    
    // Create 3 HL subjects
    for (let i = 0; i < 3; i++) {
        createIBRow(hlContainer, 'HL');
    }
    
    // Create 3 SL subjects
    for (let i = 0; i < 3; i++) {
        createIBRow(slContainer, 'SL');
    }
}

// Create IB row
function createIBRow(container, level) {
    const id = `subject-${subjectCounter++}`;
    const subjectRow = document.createElement('div');
    subjectRow.className = 'subject-row';
    subjectRow.id = id;
    subjectRow.dataset.level = level;

    const selectedSubjects = getSelectedSubjects('ib');
    const availableSubjects = subjectLists.ib.filter(s => !selectedSubjects.includes(s));
    
    let subjectOptions = `<option value="">Select subject...</option>`;
    availableSubjects.forEach(subject => {
        subjectOptions += `<option value="${subject}">${subject}</option>`;
    });

    let gradeOptionsHTML = `<option value="">Grade</option>`;
    gradeOptions.ib.forEach(grade => {
        gradeOptionsHTML += `<option value="${grade}">${grade}</option>`;
    });

    const badgeClass = level === 'HL' ? 'hl' : 'sl';

    subjectRow.innerHTML = `
        <select onchange="handleSubjectChange('ib')">${subjectOptions}</select>
        <select class="grade-select" onchange="updateProfileSummary()">${gradeOptionsHTML}</select>
        <span class="level-badge ${badgeClass}">${level}</span>
    `;

    container.appendChild(subjectRow);
}

// Get selected subjects for a qualification
function getSelectedSubjects(qual) {
    let rows;
    if (qual === 'ib') {
        const hlRows = document.getElementById('ib-hl-subjects').querySelectorAll('.subject-row');
        const slRows = document.getElementById('ib-sl-subjects').querySelectorAll('.subject-row');
        rows = [...hlRows, ...slRows];
    } else {
        const container = document.getElementById(`${qual}-subjects`);
        rows = container.querySelectorAll('.subject-row');
    }
    
    const selected = [];
    rows.forEach(row => {
        const subjectSelect = row.querySelector('select:first-child');
        if (subjectSelect && subjectSelect.value) {
            selected.push(subjectSelect.value);
        }
    });
    
    return selected;
}

// Validate subjects
function handleSubjectChange(qual) {
    const selectedSubjects = getSelectedSubjects(qual);
    const duplicates = selectedSubjects.filter((item, index) => selectedSubjects.indexOf(item) !== index);
    
    const warningDiv = document.getElementById(`${qual}-warning`);
    
    if (duplicates.length > 0) {
        warningDiv.textContent = 'You cannot select the same subject twice';
        warningDiv.classList.add('show');
        
        // Highlight duplicates
        let rows;
        if (qual === 'ib') {
            const hlRows = document.getElementById('ib-hl-subjects').querySelectorAll('.subject-row');
            const slRows = document.getElementById('ib-sl-subjects').querySelectorAll('.subject-row');
            rows = [...hlRows, ...slRows];
        } else {
            const container = document.getElementById(`${qual}-subjects`);
            rows = container.querySelectorAll('.subject-row');
        }
        
        rows.forEach(row => {
            const subjectSelect = row.querySelector('select:first-child');
            if (subjectSelect && subjectSelect.value && duplicates.includes(subjectSelect.value)) {
                subjectSelect.classList.add('error');
            } else if (subjectSelect) {
                subjectSelect.classList.remove('error');
            }
        });
    } else {
        warningDiv.classList.remove('show');
        
        // Remove error highlighting
        let rows;
        if (qual === 'ib') {
            const hlRows = document.getElementById('ib-hl-subjects').querySelectorAll('.subject-row');
            const slRows = document.getElementById('ib-sl-subjects').querySelectorAll('.subject-row');
            rows = [...hlRows, ...slRows];
        } else {
            const container = document.getElementById(`${qual}-subjects`);
            rows = container.querySelectorAll('.subject-row');
        }
        
        rows.forEach(row => {
            const subjectSelect = row.querySelector('select:first-child');
            if (subjectSelect) {
                subjectSelect.classList.remove('error');
            }
        });
    }
    
    updateProfileSummary();
}

// Add AP subject
function addSubject(qual) {
    if (qual !== 'ap') return;
    
    const container = document.getElementById('ap-subjects');
    const rows = container.querySelectorAll('.subject-row');
    
    if (rows.length >= 10) return;
    
    const id = `subject-${subjectCounter++}`;
    const subjectRow = document.createElement('div');
    subjectRow.className = 'subject-row';
    subjectRow.id = id;

    const selectedSubjects = getSelectedSubjects('ap');
    const availableSubjects = subjectLists.ap.filter(s => !selectedSubjects.includes(s));
    
    let subjectOptions = `<option value="">Select subject...</option>`;
    availableSubjects.forEach(subject => {
        subjectOptions += `<option value="${subject}">${subject}</option>`;
    });

    let gradeOptionsHTML = `<option value="">Grade</option>`;
    gradeOptions.ap.forEach(grade => {
        gradeOptionsHTML += `<option value="${grade}">${grade}</option>`;
    });

    subjectRow.innerHTML = `
        <select onchange="handleSubjectChange('ap')">${subjectOptions}</select>
        <select class="grade-select" onchange="updateProfileSummary()">${gradeOptionsHTML}</select>
        <button class="remove-subject-btn" onclick="removeSubject('${id}', 'ap')">Remove</button>
    `;

    container.appendChild(subjectRow);
    
    const countDiv = document.getElementById('ap-count');
    countDiv.textContent = `${rows.length + 1} AP exams`;
    
    if (rows.length + 1 >= 10) {
        document.getElementById('ap-add-btn').disabled = true;
    }
}

// Remove AP subject
function removeSubject(id, qual) {
    document.getElementById(id).remove();
    
    const container = document.getElementById('ap-subjects');
    const rows = container.querySelectorAll('.subject-row');
    
    const countDiv = document.getElementById('ap-count');
    countDiv.textContent = `${rows.length} AP exams`;
    
    document.getElementById('ap-add-btn').disabled = false;
    
    handleSubjectChange(qual);
    updateProfileSummary();
}

// Switch qualification type
function switchQualification(qual) {
    currentQualification = qual;
    
    // Update active button
    document.querySelectorAll('.qual-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.qual === qual);
    });

    // Show/hide containers
    document.querySelectorAll('.subjects-container').forEach(container => {
        container.classList.remove('active');
    });
    document.getElementById(`${qual}-container`).classList.add('active');

    updateProfileSummary();
}

// Update profile summary
function updateProfileSummary() {
    const qual = currentQualification;
    let rows;
    
    if (qual === 'ib') {
        const hlRows = document.getElementById('ib-hl-subjects').querySelectorAll('.subject-row');
        const slRows = document.getElementById('ib-sl-subjects').querySelectorAll('.subject-row');
        rows = [...hlRows, ...slRows];
    } else {
        const container = document.getElementById(`${qual}-subjects`);
        rows = container.querySelectorAll('.subject-row');
    }
    
    let subjects = [];
    rows.forEach(row => {
        const subjectSelect = row.querySelector('select:first-child');
        const gradeSelect = row.querySelector('.grade-select');
        
        if (subjectSelect && gradeSelect && subjectSelect.value && gradeSelect.value) {
            let subjectInfo = {
                subject: subjectSelect.value,
                grade: gradeSelect.value
            };
            
            if (qual === 'ib') {
                subjectInfo.level = row.dataset.level;
            }
            
            subjects.push(subjectInfo);
        }
    });

    if (subjects.length > 0) {
        document.getElementById('profile-summary').style.display = 'block';
        
        let summaryText = '';
        
        if (qual === 'alevels') {
            const grades = subjects.map(s => s.grade).join('');
            summaryText = `<strong>A-Levels:</strong> ${grades} in ${subjects.map(s => s.subject).join(', ')}`;
        } else if (qual === 'ib') {
            const hlSubjects = subjects.filter(s => s.level === 'HL');
            const slSubjects = subjects.filter(s => s.level === 'SL');
            
            const hlPoints = hlSubjects.reduce((sum, s) => sum + parseInt(s.grade), 0);
            const slPoints = slSubjects.reduce((sum, s) => sum + parseInt(s.grade), 0);
            const totalPoints = hlPoints + slPoints;
            
            document.getElementById('ib-total').textContent = totalPoints;
            document.getElementById('ib-hl-total').textContent = hlPoints;
            document.getElementById('ib-sl-total').textContent = slPoints;
            
            const hlGrades = hlSubjects.map(s => s.grade).join('');
            const slGrades = slSubjects.map(s => s.grade).join('');
            
            summaryText = `<strong>IB Diploma:</strong> ${totalPoints} points total<br>`;
            if (hlSubjects.length > 0) {
                summaryText += `<strong>HL:</strong> ${hlGrades} (${hlSubjects.map(s => s.subject).join(', ')})<br>`;
            }
            if (slSubjects.length > 0) {
                summaryText += `<strong>SL:</strong> ${slGrades} (${slSubjects.map(s => s.subject).join(', ')})`;
            }
        } else if (qual === 'ap') {
            summaryText = `<strong>AP Exams:</strong><br>`;
            subjects.forEach(s => {
                summaryText += `${s.subject}: ${s.grade}<br>`;
            });
            
            const satScore = document.getElementById('sat-score').value;
            if (satScore) {
                summaryText += `<strong>SAT:</strong> ${satScore}`;
            }
        }
        
        document.getElementById('profile-text').innerHTML = summaryText;
    } else {
        document.getElementById('profile-summary').style.display = 'none';
    }
    
    // Calculate matches whenever profile changes
    calculateMatches();
}

// Get unique universities
function getUniversities(data) {
    const universities = [...new Set(data.map(item => item.University))];
    return universities.filter(u => u);
}

// Create university tabs
function createUniversityTabs(universities) {
    const tabsContainer = document.getElementById('universityTabs');
    tabsContainer.innerHTML = '';
    
    universities.forEach((university, index) => {
        const button = document.createElement('button');
        button.className = `tab-button ${index === 0 ? 'active' : ''}`;
        button.textContent = university;
        button.onclick = () => switchUniversity(university);
        tabsContainer.appendChild(button);
    });
}

// Switch university tab
function switchUniversity(university) {
    currentUniversity = university;
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === university);
    });
    
    renderTable(university);
}

// Render table
function renderTable(university) {
    const contentDiv = document.getElementById('tabContent');
    const filteredData = allData.filter(item => {
        const matchesUniversity = item.University === university;
        const matchesFilter = currentFilter === 'all' || item.Classification === currentFilter;
        return matchesUniversity && matchesFilter;
    });

    if (filteredData.length === 0) {
        contentDiv.innerHTML = '<div class="no-results">No courses found for this filter.</div>';
        return;
    }

    const tableHTML = `
        <div class="table-container">
            <table>
                <colgroup>
                    <col><col><col><col><col><col>
                </colgroup>
                <thead>
                    <tr>
                        <th>Course</th>
                        <th>Type</th>
                        <th>A-Level Requirements</th>
                        <th>IB Requirements</th>
                        <th>AP/SAT Requirements</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => `
                        <tr>
                            <td class="course-name">${item.Course}</td>
                            <td class="classification-text">${item.Classification}</td>
                            <td>${item['A-Level Requirements'] || 'N/A'}</td>
                            <td>${item['IB Requirements'] || 'N/A'}</td>
                            <td>${item['AP/SAT Requirements'] || 'N/A'}</td>
                            <td>
                                ${item.Source ? `<a href="${item.Source}" target="_blank" class="source-link">View →</a>` : 'N/A'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    contentDiv.innerHTML = tableHTML;
}

// Setup qualification buttons
function setupQualificationButtons() {
    document.querySelectorAll('.qual-button').forEach(button => {
        button.addEventListener('click', function() {
            switchQualification(this.dataset.qual);
        });
    });
}

// Setup filter buttons
function setupFilters() {
    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', function() {
            currentFilter = this.dataset.filter;
            
            document.querySelectorAll('.filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            renderTable(currentUniversity);
        });
    });
}

// Setup SAT score input
const satInput = document.getElementById('sat-score');
if (satInput) {
    satInput.addEventListener('input', updateProfileSummary);
}

// Show loading
function showLoading() {
    document.getElementById('tabContent').innerHTML = '<div class="loading">Loading data</div>';
}

// Show error
function showError(message) {
    document.getElementById('tabContent').innerHTML = `
        <div class="error">
            <strong>Error loading data:</strong><br>
            ${message}<br><br>
            <small>Please check your configuration.</small>
        </div>
    `;
}

// Initialize
async function init() {
    showLoading();
    
    // Load requirements data
    const requirementsData = await fetchData(CONFIG.requirementsRange);
    if (!requirementsData) return;
    
    allData = parseData(requirementsData);
    const universities = getUniversities(allData);
    
    if (universities.length === 0) {
        showError('No universities found in the data');
        return;
    }
    
    currentUniversity = universities[0];
    
    createUniversityTabs(universities);
    setupQualificationButtons();
    setupFilters();
    renderTable(currentUniversity);
    
    // Load subject lists
    await loadSubjectLists();
}

document.addEventListener('DOMContentLoaded', init);
```

---

## **Your correct CDN URL should be:**
```
https://cdn.jsdelivr.net/gh/Miguel-FCE/grade-converter@main/converter.js
