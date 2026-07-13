# Sprint Velocity & Burndown Metric Calculations

AgileFlow calculates velocity trends and burndown margins dynamically based on active sprint scopes.

## Ideal Work Line
Calculated linearly:
$$\text{Remaining Points} = \text{Total Points} - \left( \frac{\text{Total Points}}{\text{Duration Days}} \times \text{Current Day} \right)$$

## Actual Progress Line
Summarizes remaining points of incomplete tasks in the active sprint scope on each day.
