import inquirer from "inquirer"
import PressToContinuePrompt from 'inquirer-press-to-continue'
import fs from 'fs'

console.clear()

inquirer.registerPrompt('press-to-continue', PressToContinuePrompt)

const workoutSchedule = JSON.parse(fs.readFileSync('./workout-schedule.json', 'utf-8'))

const todaysRoutine = workoutSchedule[new Date().getDay()]

if (todaysRoutine.length) {
    const sessionTable = todaysRoutine.map(workout => ({ ...workout, sets: [] }))

    for (const [i, currentWorkout] of sessionTable.entries()) {
        let currentWorkoutActive = true
        for (let setIndex = 0; currentWorkoutActive; setIndex++) {
            currentWorkout.sets[setIndex] = 'Ready'

            console.log(buildTable(sessionTable) + '\n')
            console.log(`${currentWorkout.name} Set ${setIndex + 1}\n`)

            await inquirer.prompt([
                {
                    type: 'press-to-continue',
                    anyKey: true,
                    name: 'start',
                    pressToContinueMessage: `Press any key to START set...`,
                }
            ])

            const startTime = new Date()

            console.clear()

            currentWorkout.sets[setIndex] = 'In Progress'

            console.log(buildTable(sessionTable) + '\n')
            console.log(`${currentWorkout.name} Set ${setIndex + 1}\n`)

            await inquirer.prompt([
                {
                    type: 'press-to-continue',
                    anyKey: true,
                    name: 'end',
                    pressToContinueMessage: `Press any key to END set...`,
                }
            ])

            const endTime = new Date()

            console.clear()

            currentWorkout.sets[setIndex] = {}

            //Add Data
            if (!currentWorkout.noReps) {
                console.log(buildTable(sessionTable) + '\n')

                await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'reps',
                        message: `Amount of Reps:`,
                    }
                ]).then(answer => currentWorkout.sets[setIndex].reps = answer.reps)

                console.clear()
            }

            if (currentWorkout.unit) {
                console.log(buildTable(sessionTable) + '\n')

                await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'units',
                        message: `Amount of ${currentWorkout.unit}:`,
                    }
                ]).then(answer => currentWorkout.sets[setIndex].units = answer.units)

                console.clear()
            }

            console.log(buildTable(sessionTable) + '\n')

            const answer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'setEnd',
                    message: `${currentWorkout.name}`,
                    choices: [ 'Add Set', sessionTable[i + 1] ? 'Next Workout' : 'Finished Workout' ]
                }
            ])

            console.clear()

            currentWorkout.sets[setIndex].startTime = startTime
            currentWorkout.sets[setIndex].endTime = endTime

            if (answer.setEnd !== 'Add Set') currentWorkoutActive = false
        }
    }

    console.dir(sessionTable, { depth: null })

    const workoutData = JSON.parse(fs.readFileSync('./workout-data.json'))

    workoutData.push({ session: sessionTable, date: sessionTable[0].sets[0].startTime })

    fs.writeFileSync('./workout-data.json', JSON.stringify(workoutData, null, 4))
} else {
    console.log('No Workout Today')
}

function buildTable(sessionTable) {
    const tableWidth = Math.max(...sessionTable.map(workout => workout.sets.length)) + 1
    const tableHeight = sessionTable.length + 1

    const tableData = []

    for (let y = 0; y < tableHeight; y++) {
        const row = []
        for (let x = 0; x < tableWidth; x++) {
            if (x === 0 && y === 0) row.push('')

            if (x === 0 && y > 0) {
                row.push(sessionTable[y - 1].name)
            }

            if (x > 0 && y === 0) {
                row.push(`Set ${x}`)
            }

            if (x > 0 && y > 0) {
                const workoutSet = sessionTable[y - 1].sets[x - 1]
                // console.log(sessionTable[y - 1])
                if (!workoutSet) {
                    row.push('')
                } else if (typeof workoutSet === 'string') {
                    row.push(workoutSet)
                } else if (JSON.stringify(workoutSet) === '{}') {
                    row.push('Finished')
                } else if (workoutSet.reps && workoutSet.units) {
                    row.push(`${workoutSet.reps}reps - ${workoutSet.units}${sessionTable[y - 1].unit}`)
                } else if (workoutSet.reps) {
                    row.push(`${workoutSet.reps}reps`)
                } else if (workoutSet.units) {
                    row.push(`${workoutSet.units}${sessionTable[y - 1].unit}`)
                } else {
                    row.push('')
                }
            }
        }
        tableData.push(row)
    }

    // console.log(tableData)

    const firstColumnLongestString = Math.max(...sessionTable.map(workout => workout.name.length))
    const setColumnsCharacterWidth = 17

    const tableString = tableData.map((tableRow, y) => {
        const actualRowString = tableRow.map((tableCell, x) => {
            if (x === 0) {
                return `${tableCell}${' '.repeat(firstColumnLongestString - tableCell.length + 1)}`
            } else {
                const [leftPadding, rightPadding] = splitNumber(setColumnsCharacterWidth - tableCell.length)
                return ' '.repeat(leftPadding) + tableCell + ' '.repeat(rightPadding)
            }
        }).join('|') + '|\n'

        const rowBorderString = tableRow.map((tableCell, x) => '-'.repeat(x === 0 ? firstColumnLongestString + 1 : setColumnsCharacterWidth) ).join('|') + '|'

        return actualRowString + rowBorderString
    }).join('\n')

    // console.log(tableString)
    return tableString
}

function splitNumber(num) {
    const firstPart = Math.floor(num / 2)
    const secondPart = num - firstPart
    return [firstPart, secondPart]
}