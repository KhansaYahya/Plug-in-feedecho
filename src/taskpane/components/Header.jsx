import * as React from "react";
import PropTypes from "prop-types";
import { Image, makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  welcome__header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingBottom: "30px",
    paddingTop: "60px",
    backgroundColor: "#6d415f",
  },
  message: {
    fontSize: "40px",
    fontWeight: "400",
    color: "#f4f1ec",
  },
});

const Header = (props) => {
  const { title, logo, message } = props;
  const styles = useStyles();

  return (
    <section className={styles.welcome__header}>
      <Image width="90" height="90" src={logo} alt={title} style={{ objectFit: "contain", borderRadius: "12px" }} />
      <h1 className={styles.message}>{message}</h1>
    </section>
  );
};

Header.propTypes = {
  title: PropTypes.string,
  logo: PropTypes.string,
  message: PropTypes.string,
};

export default Header;
