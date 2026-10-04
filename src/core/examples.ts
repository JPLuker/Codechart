export type Example = { id: string; title: string; description: string; category: string; code: string };
export const examples: Example[] = [
{ id: 'payroll', title: 'Overtime pay', description: 'A simple selection with two paths and a shared output.', category: 'Selection', code: `// Calculate weekly pay, including overtime\nSTART\n\nINPUT hours\nINPUT hourlyRate\n\nIF hours > 40\n    SET pay = 40 * hourlyRate + (hours - 40) * hourlyRate * 1.5\nELSE\n    SET pay = hours * hourlyRate\nENDIF\n\nOUTPUT pay\nEND` },
{ id: 'sentinel', title: 'Sentinel-controlled input', description: 'Priming input, a running total, and a sentinel value.', category: 'While loop', code: `START\nSET total = 0\nINPUT amount\n\nWHILE amount != 0\n    SET total = total + amount\n    INPUT amount\nENDWHILE\n\nOUTPUT total\nEND` },
{ id: 'grades', title: 'Grade classifier', description: 'Nested decisions turn a score into a letter grade.', category: 'Nested selection', code: `START\nINPUT score\n\nIF score >= 90\n    OUTPUT "A"\nELSE\n    IF score >= 80\n        OUTPUT "B"\n    ELSE\n        IF score >= 70\n            OUTPUT "C"\n        ELSE\n            OUTPUT "Keep practicing"\n        ENDIF\n    ENDIF\nENDIF\n\nEND` },
{ id: 'menu', title: 'Menu that repeats', description: 'A post-test loop runs once before checking its condition.', category: 'Do / Until', code: `START\nDO\n    OUTPUT "1. Continue  0. Quit"\n    INPUT choice\n    IF choice = 1\n        OUTPUT "Continuing..."\n    ENDIF\nUNTIL choice = 0\nEND` },
{ id: 'counter', title: 'Count and accumulate', description: 'FOR generates initialization, a test, and an increment.', category: 'For loop', code: `START\nSET total = 0\nFOR counter = 1 TO 5\n    INPUT number\n    SET total = total + number\nENDFOR\nOUTPUT total\nEND` },
{ id: 'modules', title: 'Employee net pay', description: 'A structured main loop with housekeeping and finish modules.', category: 'Modules', code: `START\nCALL housekeeping\nWHILE employeeName != "ZZZZ"\n    CALL mainLoop\nENDWHILE\nCALL finish\nEND\n\nMODULE housekeeping\n    SET employeeCount = 0\n    INPUT employeeName\nENDMODULE\n\nMODULE mainLoop\n    INPUT grossPay\n    INPUT deductions\n    SET netPay = grossPay - deductions\n    IF netPay >= 0\n        OUTPUT employeeName, netPay\n    ELSE\n        OUTPUT "Check deductions"\n    ENDIF\n    SET employeeCount = employeeCount + 1\n    INPUT employeeName\nENDMODULE\n\nMODULE finish\n    OUTPUT employeeCount\nENDMODULE` },
{ id: 'exit', title: 'Early exit', description: 'A STOP ends its path, while the other branch continues.', category: 'Control flow', code: `START\nINPUT balance\nIF balance < 0\n    OUTPUT "Insufficient funds"\n    STOP\nENDIF\nINPUT withdrawal\nIF withdrawal <= balance\n    SET balance = balance - withdrawal\n    OUTPUT balance\nELSE\n    OUTPUT "Withdrawal declined"\nENDIF\nEND` }
];
export const snippets = [
  { label: 'Input', hint: 'Read a value', code: 'INPUT value' },
  { label: 'Output', hint: 'Display a result', code: 'OUTPUT "message"' },
  { label: 'Process', hint: 'Set or calculate', code: 'SET total = 0' },
  { label: 'If / Else', hint: 'Choose a path', code: 'IF condition\n    OUTPUT "Yes"\nELSE\n    OUTPUT "No"\nENDIF' },
  { label: 'While', hint: 'Test, then repeat', code: 'WHILE condition\n    SET counter = counter + 1\nENDWHILE' },
  { label: 'Do / Until', hint: 'Repeat, then test', code: 'DO\n    INPUT choice\nUNTIL choice = 0' },
  { label: 'For', hint: 'Count iterations', code: 'FOR counter = 1 TO 10\n    OUTPUT counter\nENDFOR' },
  { label: 'Call', hint: 'Use a module', code: 'CALL moduleName' },
  { label: 'Module', hint: 'Define reusable logic', code: 'MODULE moduleName\n    OUTPUT "Hello"\nENDMODULE' }
];
