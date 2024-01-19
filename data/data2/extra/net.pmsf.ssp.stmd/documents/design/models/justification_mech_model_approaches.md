# Mechanical Submodel

The mechanic submodel is modelled using an inertia and a rotational damper, because this is the most detailed data available, about the DC motor XY123456 (see #analysis_project_information).

## Friction

The brush and bearing friction is given as a constant torque in #analysis_project_information, therefore it is modelled as a constant torque (can be parametrized). The parameter of the stiction torque is set equal to the parameter of the friction torque (see #req_parameter_03).

## Load torque

For the load torque, no further information is given. As required #req_test_02, a constant load torque of 1 Nm must be applied to the DC-Motor, therefore it is modelled as a constant value (can be parametrized with parameter M_l).

## Inputs/Outputs

The torque from the electrical motor is used as an input, as required in #req_model_09.

The rotational speed is required as an output, because it is required as input in the electrical submodel to calculate the electrical torque.