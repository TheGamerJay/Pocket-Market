import React from "react";
import TopBar from "../components/TopBar.jsx";
import Card from "../components/Card.jsx";

export default function Search(){
  return (
    <>
      <TopBar title="Search" />
      <div style={{height:12}}/>
      <Card>
        <div className="muted">
          MVP search comes next (title/category/city). Keeping it clean.
        </div>
      </Card>
    </>
  );
}
