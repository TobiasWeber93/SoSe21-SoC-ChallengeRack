import React, { useState, useEffect } from 'react';
import { deleteChallenge } from '../graphql/mutations';
import DetailedPage from './detailedPage'
import Box from '@material-ui/core/Box';
import { Button, Icon } from '@material-ui/core';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import { API, graphqlOperation } from 'aws-amplify';
import { listChallenges } from '../graphql/queries';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { lighten, makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import DeleteIcon from '@material-ui/icons/Delete';
import Search from "@material-ui/icons/Search";
import TextField from '@material-ui/core/TextField';

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells = [
  { id: 'phase', numeric: false, disablePadding: true, label: 'Phase' },
  { id: 'status', numeric: false, disablePadding: false, label: 'Status' },
  { id: 'orgaTitle', numeric: false, disablePadding: false, label: 'Orga. Name.' },
  { id: 'orgaLocat', numeric: false, disablePadding: false, label: 'Orga. Locat.' },
  { id: 'chatitle', numeric: false, disablePadding: false, label: 'Chall. Title' },
  { id: 'type', numeric: false, disablePadding: false, label: 'Type' },
  { id: 'theme', numeric: false, disablePadding: false, label: 'Theme' },
  { id: 'technology', numeric: false, disablePadding: false, label: 'Technology' },
];

function EnhancedTableHead(props) {
  const { classes, order, orderBy, onRequestSort } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell>
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align="left"
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <span className={classes.visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </span>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  classes: PropTypes.object.isRequired,
  onRequestSort: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
  rowCount: PropTypes.number.isRequired,
};

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  paper: {
    width: '100%',
    marginBottom: theme.spacing(2),
    padding: "30px",
  },
  table: {
    minWidth: 750,
  },
  visuallyHidden: {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    top: 20,
    width: 1,
  },
  root2: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1),
  },
  highlight:
    theme.palette.type === 'light'
      ? {
        color: theme.palette.secondary.main,
        backgroundColor: lighten(theme.palette.secondary.light, 0.85),
      }
      : {
        color: theme.palette.text.primary,
        backgroundColor: theme.palette.secondary.dark,
      },
  title: {
    flex: '1 1 100%',
  },
  search: {
    "& > div": {
      marginTop: "0",
    },
    [theme.breakpoints.down("sm")]: {
      margin: "10px 15px !important",
      float: "none !important",
      paddingTop: "1px",
      paddingBottom: "1px",
      padding: "0!important",
      width: "60%",
      marginTop: "40px",
      "& input": {
        color: "#FFF",
      },
    },
  },
  searchButton: {
    [theme.breakpoints.down("sm")]: {
      top: "-50px !important",
      marginRight: "22px",
      float: "right",
    },
  },
  searchIcon: {
    width: "17px",
    zIndex: "4",
  },
  searchWrapper: {
    [theme.breakpoints.down("sm")]: {
      width: "-webkit-fill-available",
      margin: "10px 15px 0",
    },
    paddingLeft: "15px",
    display: "inline-block",
    float: "left",
  },
  button: {
    display: "inline-block",
  },
}));
export default function PrintList({ props, setShow, challenges }) {
  const classes = useStyles();
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('calories');
  const [search, setSearch] = useState([]);
  const [challSearch, setchallSearch] = useState(null);

  const [apiError, setApiError] = useState();
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleHide = (event) => {
    setShow(prev => !prev);
  };
  const handleSearch = (event) => {
    setSearch(event.target.value);
    if (event.target.value == "") {
      setchallSearch(null);
    } else {
      setchallSearch(event.target.value.toLowerCase());
    }
  };
  return (
    <div className={classes.root}>
      <Paper className={classes.paper}>
        <Typography align="center" gutterBottom variant="h4">{!props.language ? "Druckübersicht" : "Print Overview"}</Typography>
        <IconButton
          button
          onClick={() => { setShow(0) }}>
          <Icon >
            <ChevronLeftIcon />
          </Icon>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        </IconButton>
        <Toolbar>
          <TextField
            value={search}
            onChange={(event) => { handleSearch(event); }}
            placeholder={!props.language ? "Suche..." : "Search..."}
          />
          <Icon color="white" aria-label="edit" justIcon round>
            <Search />
          </Icon>
        </Toolbar>
        <div align="left">
          <Button onClick={window.print} variant="outlined">{!props.language ? "Drucken" : "Print"}</Button>
        </div>
        <TableContainer>
          <Table
            className={classes.table}
            aria-labelledby="tableTitle"
            size="small"
            aria-label="enhanced table"
          >
            <EnhancedTableHead
              classes={classes}
              order={order}
              orderBy={orderBy}
              onRequestSort={handleRequestSort}
              rowCount={challenges.length}
            />
            <TableBody>
              {stableSort(challenges.filter(challenge => (challenge.search == challSearch || challenge.phase.toLowerCase().includes(challSearch) || challenge.status.toLowerCase().includes(challSearch) || challenge.orgaTitle.toLowerCase().includes(challSearch) || challenge.orgaLocat.toLowerCase().includes(challSearch) || challenge.chatitle.toLowerCase().includes(challSearch) || challenge.type.toLowerCase().includes(challSearch) || challenge.theme.toLowerCase().includes(challSearch) || challenge.technology.toLowerCase().includes(challSearch))), getComparator(order, orderBy))
                .map((challenge, index) => {
                  const labelId = `enhanced-table-checkbox-${index}`;
                  return (
                    <TableRow
                      hover
                      role="checkbox"
                      tabIndex={-1}
                      key={challenge.id}
                    >
                      <TableCell>
                        <img onError={(event) => event.target.src = 'https://amplify-rack-dev-145931-deployment.s3.amazonaws.com/noPicture.jpg'} height="25" src={"https://amplify-rack-dev-145931-deployment.s3.amazonaws.com/" + challenge.orgaTitle + ".jpg"} />
                      </TableCell>
                      <TableCell component="th" id={labelId} scope="challenge" padding="none">
                        {challenge.phase}
                      </TableCell>
                      <TableCell align="left">{challenge.status}</TableCell>
                      <TableCell align="left">{challenge.orgaTitle}</TableCell>
                      <TableCell align="left">{challenge.orgaLocat}</TableCell>
                      <TableCell align="left">{challenge.chatitle}</TableCell>
                      <TableCell align="left">{challenge.type}</TableCell>
                      <TableCell align="left">{challenge.theme}</TableCell>
                      <TableCell align="left">{challenge.technology}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}