import styled from 'styled-components';

const ThreeColumnLayout = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -15px;
`;

ThreeColumnLayout.LeftColumn = styled.div`
  flex: 1;
  padding: 15px;
`;

ThreeColumnLayout.MainColumn = styled.div`
  flex: 2;
  padding: 15px;
`;

ThreeColumnLayout.RightColumn = styled.div`
  flex: 1;
  padding: 15px;
`;

export default ThreeColumnLayout;
