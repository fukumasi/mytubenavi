import styled from 'styled-components';

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  max-width: 300px;
  margin: 0 auto;
`;

export const Input = styled.input`
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

export const Button = styled.button`
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background-color: #0056b3;
  }
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

export const GoogleButton = styled(Button)`
  background-color: #4285F4;
  &:hover {
    background-color: #357ae8;
  }
`;

export const ErrorMessage = styled.div`
  color: red;
  margin-top: 10px;
`;

export const SuccessMessage = styled.div`
  color: green;
  margin-top: 10px;
`;

export const Label = styled.label`
  margin-bottom: 5px;
`;

export const Select = styled.select`
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

export const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  margin-right: 5px;
`;

export const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
`;

export const RadioButton = styled.input.attrs({ type: 'radio' })`
  margin-right: 5px;
`;

export const TextArea = styled.textarea`
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
`;