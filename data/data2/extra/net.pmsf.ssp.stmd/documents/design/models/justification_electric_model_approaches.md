# Electric Submodel

The electric submodel is modelled using a simple linear torque generation model, as given in #req_model_02

## Voltage-influencing elements

As given in #req_model_02 and #analysis_project_information, the voltage-influencing elements are consisting of a temperature-independent ideal resistor, an ideal inductance and the torque generation via induction.

## Losses

Copper losses are included in the resistance (cf. #design_electric_copper_losses, #req_model_06).

Magnetic losses don't need to be taken into account, as they were calculated to be below 3%, according to the Steinmetz formula (cf. #req_model_07).


## Inputs/Outputs

The voltage from the battery model is used as an input (#req_model_03).

The electrical torque is used as an output of the model (#req_model_04).

Moreover, the rotational speed of the motor is used as an input (#req_model_05), as it is needed for the torque generation (cf. #design_submodel_electrical).